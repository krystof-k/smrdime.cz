import { COOL_CUTOFF_C } from "@/lib/display";
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

// Mirror /api/tram: short edge cache, stale-while-revalidate so social crawlers
// always get a fast response. They cache the result hard anyway, so this is a
// fresh-ish snapshot rather than a live ticker.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=600";

type Font = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal";
};

// Geist lives on Google Fonts; loadGoogleFont returns a Satori-ready buffer.
// Cache the fetch per isolate — the fonts never change and each fetch is a
// network round trip we don't want on every cached-miss render.
let fontsPromise: Promise<Font[]> | null = null;

function loadFonts(loadGoogleFont: WorkersOg["loadGoogleFont"]): Promise<Font[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      loadGoogleFont({ family: "Geist", weight: 400 }),
      loadGoogleFont({ family: "Geist", weight: 900 }),
      loadGoogleFont({ family: "Geist Mono", weight: 700 }),
    ]).then(([sans, sansBlack, mono]) => [
      { name: "Geist", data: sans, weight: 400, style: "normal" },
      { name: "Geist", data: sansBlack, weight: 900, style: "normal" },
      { name: "Geist Mono", data: mono, weight: 700, style: "normal" },
    ]);
  }
  return fontsPromise;
}

// Below the AC cutoff the site drops the "it's hot, we stink" framing, so the
// card cools its palette to match. Reuses the one threshold to avoid drift.
const WARM = { from: "#f97316", to: "#dc2626" };
const COOL = { from: "#2563eb", to: "#4338ca" };

function gradientFor(temperature: number | null) {
  if (temperature !== null && temperature < COOL_CUTOFF_C) return COOL;
  return WARM;
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

export async function GET() {
  const { ImageResponse, loadGoogleFont } = await import("workers-og");

  const [analysis, temperature, fonts] = await Promise.all([
    analyzeTramACStatus().catch(() => null),
    fetchTemperature(),
    loadFonts(loadGoogleFont),
  ]);

  const count = analysis?.tramsWithoutAC ?? 0;
  const total = analysis?.totalTrams ?? 0;
  const gradient = gradientFor(temperature);

  const eyebrow =
    temperature !== null ? `V Praze je teď ${temperature} °C` : "Pražské tramvaje v reálném čase";

  const footer = total > 0 ? `smrdíme.cz · z ${total} tramvají v provozu` : "smrdíme.cz";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        color: "#ffffff",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", fontSize: 36, fontWeight: 400, opacity: 0.85 }}>{eyebrow}</div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "Geist Mono",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 280 }}>{count}</span>
          <span style={{ fontSize: 72, marginLeft: 28, fontFamily: "Geist", fontWeight: 900 }}>
            tramvají
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 900, marginTop: 8 }}>
          jezdí v Praze bez klimatizace
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 30, fontWeight: 400, opacity: 0.85 }}>{footer}</div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: { "Cache-Control": CACHE_CONTROL },
    },
  );
}
