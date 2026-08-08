import { getCloudflareContext } from "@opennextjs/cloudflare";
import { WEATHER_API_URL, WEATHER_CACHE_TTL_SECONDS } from "@/lib/constants";
import { getTemperatureEmoji, getTemperatureHex, NEUTRAL_HEX } from "@/lib/display";
import { withEdgeCache } from "@/lib/edge-cache";
import { OG_EMOJI } from "@/lib/og-emoji";
import { OG_FONTS } from "@/lib/og-fonts";
import { analyzeACStatus } from "@/lib/vehicle-analysis";
import { VEHICLE_MODES, vehicleNoun } from "@/lib/vehicle-modes";

// workers-og pulls in Satori/resvg WASM that only links in the Cloudflare
// worker, not when Next evaluates this module in Node at build time. Importing
// it dynamically inside the handler keeps the WASM out of module evaluation so
// `next build`'s page-data collection doesn't try (and fail) to load it.

// Image generation fetches live data and renders WASM at request time, so it
// must never be prerendered at build (no network / no GOLEMIO_API_KEY there).
export const dynamic = "force-dynamic";

// Render at 2x and let platforms downscale. Satori/resvg has no browser-grade
// hinting or subpixel AA, so supersampling is what keeps Geist's thin strokes
// crisp instead of fattened at 1200px.
const SCALE = 2;
const WIDTH = 1200 * SCALE;
const HEIGHT = 630 * SCALE;

// Every og:image URL is unique (30s bucket on page scrapes, share token on
// shared links), so a long TTL never serves stale numbers to a *new* URL — it
// just keeps an already-rendered card around, so repeat fetches of one share
// URL are free and stay consistent. `s-maxage` is what the Cache API put below
// stores the render under, and what the platforms' own caches honour; the rest
// of the directives are for those, since the Cache API reads only s-maxage.
// That store is per colo, so the share-click prewarm only hands the finished
// card to a scraper resolving to the colo that served the click. The card
// stamps its own capture time.
const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=86400, stale-if-error=3600";

// When tram data is unavailable, fail the render instead of claiming "0 trams
// without AC" — platforms keep the previous unfurl on error. An already-cached
// card for this URL is unaffected: the cache lookup runs before this path, so
// the error is only ever what a *cold* URL gets. (stale-if-error is a directive
// for the platforms' caches; the Cache API doesn't implement it.)
const ERROR_CACHE_CONTROL = "public, s-maxage=5";

// Prague-local "23. 6. 2026 14:32", shown subtly top-right like the site clock.
const STAMP_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Homepage palette (light theme): the page background gradient and headline
// text color, so the card reads as a screenshot of the live site.
const BG = "linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff)";
const TEXT = "#1f2937"; // gray-800
const FONT_SIZE = 78 * SCALE;
const LINE_HEIGHT = 1.1;
const EMOJI_SIZE = 68 * SCALE;
// Satori trims leading/trailing whitespace inside flex items, so inter-word
// spaces vanish. Space the inline units with an explicit margin instead.
const SPACE = 20 * SCALE;
const PAD_Y = 64 * SCALE;
const PAD_X = 72 * SCALE;

type Font = { name: string; data: ArrayBuffer; weight: 100 | 400 | 700 | 900; style: "normal" };

// Subset Geist faces baked into the bundle (see scripts/generate-og-fonts.mjs)
// — a cold isolate previously spent five Google Fonts round trips here, which
// was the main reason OG scrapers timed out on cold renders. Decoded once per
// isolate.
let fontsCache: Font[] | null = null;

function getFonts(): Font[] {
  if (!fontsCache) {
    fontsCache = OG_FONTS.map(({ name, weight, base64 }) => ({
      name,
      weight,
      style: "normal" as const,
      data: Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer as ArrayBuffer,
    }));
  }
  return fontsCache;
}

async function fetchTemperature(): Promise<number | null> {
  try {
    const res = await fetch(
      WEATHER_API_URL,
      withEdgeCache(WEATHER_CACHE_TTL_SECONDS, { signal: AbortSignal.timeout(5000) }),
    );
    if (!res.ok) return null;
    const payload = (await res.json()) as { current_weather?: { temperature?: number } };
    const temp = payload.current_weather?.temperature;
    return typeof temp === "number" ? Math.round(temp) : null;
  } catch {
    return null;
  }
}

// Mirrors VehicleHeadline's weight/color mix so the card reads like the homepage.
// Each unit carries a trailing space as a margin (see SPACE); pass a smaller
// marginRight for sub-word gaps like the thin space in "28 °C" — a literal
// U+202F would depend on Geist having the glyph, a margin doesn't.
function word(
  text: string,
  weight: 100 | 400 | 900,
  color?: string,
  mono?: boolean,
  marginRight: number = SPACE,
) {
  return (
    <span
      style={{
        fontWeight: weight,
        fontFamily: mono ? "Geist Mono" : "Geist",
        color,
        marginRight,
      }}
    >
      {text}
    </span>
  );
}

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

// An emoji string (often a pair like "🌤️😒") becomes self-hosted Apple PNGs:
// tight within the group, a normal word space after it. Unknown graphemes are
// skipped rather than rendered as tofu.
function emoji(str: string) {
  const segments = [...segmenter.segment(str)].map((s) => s.segment).filter((s) => OG_EMOJI[s]);
  const lastIdx = segments.length - 1;
  return segments.map((segment, idx) => {
    const key = `${segment}-${idx}`;
    return (
      // biome-ignore lint/a11y/useAltText: Satori renders to a raster, no a11y tree.
      // biome-ignore lint/performance/noImgElement: not the DOM — this is Satori JSX.
      <img
        key={key}
        src={OG_EMOJI[segment]}
        width={EMOJI_SIZE}
        height={EMOJI_SIZE}
        // alignSelf centers the glyph on the line box instead of sitting it on
        // the text baseline; trailing margin is a word space after the group,
        // tight (3px logical) within it.
        style={{ alignSelf: "center", marginRight: idx === lastIdx ? SPACE : 3 * SCALE }}
      />
    );
  });
}

// The DOM lib's CacheStorage doesn't declare `default`, and workerd implements
// only these two members of it (keys/matchAll/add all throw "not implemented"),
// so describe what's actually there rather than borrowing the DOM `Cache` type.
type ColoCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

// getCloudflareContext types `ctx` as workerd's ExecutionContext, which lands as
// `any` without @cloudflare/workers-types. Name the one method we call so a
// typo can't slip through untyped.
type ExecutionCtx = { waitUntil(promise: Promise<unknown>): void };

export async function GET(request: Request) {
  // The 2400×1260 Satori/resvg render is the most expensive thing this app
  // does, and unlike the upstream fetches it can't be deduplicated by URL —
  // every og:image URL is deliberately unique. So keep the finished card:
  // a hit means this exact URL is being fetched again (a scraper retrying, a
  // link going around, or someone hammering /og), and none of those should pay
  // for a re-render.
  const cache = (caches as unknown as { default: ColoCache }).default;
  // Next routes HEAD into this same GET export, and workerd's cache rejects a
  // non-GET key on both match and put — keyed on the incoming request, a HEAD
  // would miss, re-render, and then throw on the put. Key on the URL alone.
  const cacheKey = new Request(request.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const { ImageResponse } = await import("workers-og");

  const mode = new URL(request.url).searchParams.get("v") === "bus" ? "bus" : "tram";
  const { emoji: vehicleEmoji } = VEHICLE_MODES[mode];

  const fonts = getFonts();
  const [analysis, temperature] = await Promise.all([
    analyzeACStatus(mode).catch(() => null),
    fetchTemperature(),
  ]);

  if (!analysis) {
    return new Response("Failed to fetch vehicle status", {
      status: 500,
      headers: { "Cache-Control": ERROR_CACHE_CONTROL },
    });
  }

  const count = analysis.onTrack.vehiclesWithoutAC;
  const accent = temperature !== null ? getTemperatureHex(temperature) : NEUTRAL_HEX;
  const stamp = STAMP_FORMAT.format(new Date());

  const headline =
    temperature !== null
      ? [
          word("V", 400),
          word("Praze", 900),
          word("je", 100),
          word(`${temperature}`, 900, accent, true, 8 * SCALE),
          word("°C", 900, accent, true),
          ...emoji(getTemperatureEmoji(temperature)),
          // Full-width flex item forces a wrap, mirroring VehicleHeadline's <br/>.
          <div key="br" style={{ width: "100%" }} />,
          word("a jezdí", 100),
          word(`${count}`, 900, accent, true),
          word(vehicleNoun(mode, count), 100),
          ...emoji(vehicleEmoji),
          <div key="br2" style={{ width: "100%" }} />,
          word("bez klimatizace.", 900),
        ]
      : [
          word("V", 400),
          word("Praze", 900),
          word("jezdí", 100),
          word(`${count}`, 900, accent, true),
          word(vehicleNoun(mode, count), 100),
          ...emoji(vehicleEmoji),
          <div key="br2" style={{ width: "100%" }} />,
          word("bez klimatizace.", 900),
        ];

  const image = new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${PAD_Y}px ${PAD_X}px`,
        // Solid white under the gradient so the PNG is never transparent —
        // Facebook (and others) composite the OG image on grey, which made the
        // card look dark.
        backgroundColor: "#ffffff",
        backgroundImage: BG,
        color: TEXT,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: PAD_Y,
          right: PAD_X,
          display: "flex",
          fontFamily: "Geist Mono",
          fontSize: 26 * SCALE,
          fontWeight: 400,
          color: "#d1d5db",
        }}
      >
        {stamp}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          position: "absolute",
          right: PAD_X,
          bottom: PAD_Y,
          display: "flex",
          fontSize: 44 * SCALE,
          fontWeight: 400,
          color: TEXT,
        }}
      >
        smrdime.cz
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: { "Cache-Control": CACHE_CONTROL },
    },
  );

  // Store a clone so the original still streams to this caller; waitUntil keeps
  // the isolate alive until the copy lands. The stored TTL comes from
  // CACHE_CONTROL's s-maxage. A render that fails mid-stream errors the body
  // after the 200 is already committed, which rejects the put — nothing is
  // stored either way, but an unhandled rejection here would surface as a
  // Worker exception.
  const { ctx } = getCloudflareContext<Record<string, unknown>, ExecutionCtx>();
  ctx.waitUntil(cache.put(cacheKey, image.clone()).catch(() => {}));

  return image;
}
