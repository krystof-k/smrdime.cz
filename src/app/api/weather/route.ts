import { NextResponse } from "next/server";
import { WEATHER_API_URL } from "@/lib/constants";

/**
 * Server-side proxy in front of Open-Meteo. The edge cache deduplicates
 * concurrent requests globally; clients then poll this endpoint at a much
 * lower cadence than the tram data, since the temperature barely moves
 * minute to minute.
 */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600";
const ERROR_CACHE_CONTROL = "public, s-maxage=10";
const REQUEST_TIMEOUT_MS = 8000;

export async function GET() {
  try {
    const response = await fetch(WEATHER_API_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Open-Meteo failed: ${response.status}`);

    const payload = (await response.json()) as { current_weather: { temperature: number } };
    const temperature = Math.round(payload.current_weather.temperature);

    return NextResponse.json({ temperature }, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch (error) {
    console.error("weather API failed", error);
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 500, headers: { "Cache-Control": ERROR_CACHE_CONTROL } },
    );
  }
}
