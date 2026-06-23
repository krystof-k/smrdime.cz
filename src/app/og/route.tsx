import { WEATHER_API_URL } from "@/lib/constants";
import { getTemperatureEmoji, getTemperatureHex, NEUTRAL_HEX } from "@/lib/display";
import { OG_EMOJI } from "@/lib/og-emoji";
import { analyzeTramACStatus } from "@/lib/tram-analysis";

// workers-og pulls in Satori/resvg WASM that only links in the Cloudflare
// worker, not when Next evaluates this module in Node at build time. Importing
// it dynamically inside the handler keeps the WASM out of module evaluation so
// `next build`'s page-data collection doesn't try (and fail) to load it.
type WorkersOg = typeof import("workers-og");

// Image generation fetches live data and renders WASM at request time, so it
// must never be prerendered at build (no network / no GOLEMIO_API_KEY there).
export const dynamic = "force-dynamic";

// Render at 2x and let platforms downscale. Satori/resvg has no browser-grade
// hinting or subpixel AA, so supersampling is what keeps Geist's thin strokes
// crisp instead of fattened at 1200px.
const SCALE = 2;
const WIDTH = 1200 * SCALE;
const HEIGHT = 630 * SCALE;

// Match /api/tram's data cadence (~30s) so direct hits stay fresh while still
// deduping the Golemio call behind the edge cache. The card also stamps its own
// capture time, so a platform that caches the unfurl can't silently go stale.
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300";

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

// Geist lives on Google Fonts; loadGoogleFont returns a Satori-ready buffer.
// Cache the fetch per isolate — the fonts never change and each fetch is a
// network round trip we don't want on every cached-miss render.
let fontsPromise: Promise<Font[]> | null = null;

function loadFonts(loadGoogleFont: WorkersOg["loadGoogleFont"]): Promise<Font[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      loadGoogleFont({ family: "Geist", weight: 100 }),
      loadGoogleFont({ family: "Geist", weight: 400 }),
      loadGoogleFont({ family: "Geist", weight: 900 }),
      loadGoogleFont({ family: "Geist Mono", weight: 400 }),
      loadGoogleFont({ family: "Geist Mono", weight: 900 }),
    ]).then(([thin, regular, black, mono, monoBlack]) => [
      { name: "Geist", data: thin, weight: 100, style: "normal" },
      { name: "Geist", data: regular, weight: 400, style: "normal" },
      { name: "Geist", data: black, weight: 900, style: "normal" },
      { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      { name: "Geist Mono", data: monoBlack, weight: 900, style: "normal" },
    ]);
    // Don't cache a rejection — a transient font-fetch failure would otherwise
    // wedge every later render in this isolate. Reset so the next request retries.
    fontsPromise.catch(() => {
      fontsPromise = null;
    });
  }
  return fontsPromise;
}

async function fetchTemperature(): Promise<number | null> {
  try {
    const res = await fetch(WEATHER_API_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const payload = (await res.json()) as { current_weather?: { temperature?: number } };
    const temp = payload.current_weather?.temperature;
    return typeof temp === "number" ? Math.round(temp) : null;
  } catch {
    return null;
  }
}

// Mirrors TramHeadline's weight/color mix so the card reads like the homepage.
// Each unit carries a trailing space as a margin (see SPACE).
function word(text: string, weight: 100 | 400 | 900, color?: string, mono?: boolean) {
  return (
    <span
      style={{
        fontWeight: weight,
        fontFamily: mono ? "Geist Mono" : "Geist",
        color,
        marginRight: SPACE,
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

export async function GET() {
  const { ImageResponse, loadGoogleFont } = await import("workers-og");

  const [analysis, temperature, fonts] = await Promise.all([
    analyzeTramACStatus().catch(() => null),
    fetchTemperature(),
    loadFonts(loadGoogleFont),
  ]);

  const count = analysis?.tramsWithoutAC ?? 0;
  const accent = temperature !== null ? getTemperatureHex(temperature) : NEUTRAL_HEX;
  const stamp = STAMP_FORMAT.format(new Date());

  const headline =
    temperature !== null
      ? [
          word("V", 400),
          word("Praze", 900),
          word("je", 100),
          word(`${temperature}°C`, 900, accent, true),
          ...emoji(getTemperatureEmoji(temperature)),
          // Full-width flex item forces a wrap, mirroring TramHeadline's <br/>.
          <div key="br" style={{ width: "100%" }} />,
          word("a jezdí", 100),
          word(`${count}`, 900, accent, true),
          word("tramvají", 100),
          ...emoji("🚋"),
          <div key="br2" style={{ width: "100%" }} />,
          word("bez klimatizace.", 900),
        ]
      : [
          word("V", 400),
          word("Praze", 900),
          word("jezdí", 100),
          word(`${count}`, 900, accent, true),
          word("tramvají", 100),
          ...emoji("🚋"),
          <div key="br2" style={{ width: "100%" }} />,
          word("bez klimatizace.", 900),
        ];

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${PAD_Y}px ${PAD_X}px`,
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
}
