import { NextResponse } from "next/server";
import { WEATHER_API_URL, WEATHER_CACHE_TTL_SECONDS } from "@/lib/constants";
import { cachedFetch } from "@/lib/edge-cache";

/**
 * Server-side proxy in front of Open-Meteo. What keeps us inside Open-Meteo's
 * per-IP quota is the edge-cached subrequest below, not this header — on
 * Workers `s-maxage` only instructs shared caches in front of us, and there is
 * no edge cache holding this response (see `withEdgeCache`). Clients poll this
 * endpoint at a much lower cadence than the tram data anyway, since the
 * temperature barely moves minute to minute.
 */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600";
const ERROR_CACHE_CONTROL = "public, s-maxage=10";
const REQUEST_TIMEOUT_MS = 8000;
// Open-Meteo puts the actual cause in the body ({"error":true,"reason":"..."}),
// so a rate limit and a malformed request are indistinguishable by status alone.
const UPSTREAM_SNIPPET_LENGTH = 200;

export async function GET() {
  let upstreamStatus: number | null = null;
  try {
    const response = await cachedFetch(WEATHER_API_URL, {
      ttlSeconds: WEATHER_CACHE_TTL_SECONDS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    upstreamStatus = response.status;
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Open-Meteo failed: ${response.status} ${body.slice(0, UPSTREAM_SNIPPET_LENGTH)}`,
      );
    }

    const payload = (await response.json()) as { current_weather?: { temperature?: number } };
    const temperature = payload.current_weather?.temperature;
    if (typeof temperature !== "number") {
      throw new Error(
        `Open-Meteo returned no temperature: ${JSON.stringify(payload).slice(0, UPSTREAM_SNIPPET_LENGTH)}`,
      );
    }

    return NextResponse.json(
      { temperature: Math.round(temperature) },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    // The Workers log showed only a stack when the Error was passed as its own
    // argument, so interpolate the message to keep failures diagnosable.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`weather API failed (upstream ${upstreamStatus ?? "unreachable"}): ${reason}`);
    return NextResponse.json(
      { error: "Failed to fetch weather", upstream: upstreamStatus },
      { status: 500, headers: { "Cache-Control": ERROR_CACHE_CONTROL } },
    );
  }
}
