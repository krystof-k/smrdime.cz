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

const WIDTH = 1200;
const HEIGHT = 630;

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
const FONT_SIZE = 78;
const EMOJI_SIZE = 70;
// Satori trims leading/trailing whitespace inside flex items, so inter-word
// spaces vanish. Space the inline units with an explicit margin instead.
const SPACE = 20;

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
      loadGoogleFont({ family: "Geist Mono", weight: 700 }),
    ]).then(([thin, regular, black, mono]) => [
      { name: "Geist", data: thin, weight: 100, style: "normal" },
      { name: "Geist", data: regular, weight: 400, style: "normal" },
      { name: "Geist", data: black, weight: 900, style: "normal" },
      { name: "Geist Mono", data: mono, weight: 700, style: "normal" },
    ]);
  }
  return fontsPromise;
}

async function fetchTemperature(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=50.0755&longitude=14.4378&current_weather=true",
      { signal: AbortSignal.timeout(5000) },
    );
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
        style={{ marginRight: idx === lastIdx ? SPACE : 3, marginBottom: -10 }}
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
          word("bez klimatizace.", 900),
        ]
      : [
          word("V", 400),
          word("Praze", 900),
          word("jezdí", 100),
          word(`${count}`, 900, accent, true),
          word("tramvají", 100),
          ...emoji("🚋"),
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
        padding: "64px 72px",
        backgroundImage: BG,
        color: TEXT,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 72,
          display: "flex",
          fontFamily: "Geist Mono",
          fontSize: 26,
          fontWeight: 400,
          color: "#9ca3af",
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
          lineHeight: 1.2,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 48,
          display: "flex",
          fontSize: 44,
          fontWeight: 900,
          color: TEXT,
        }}
      >
        smrdíme.cz
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
