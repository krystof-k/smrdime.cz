import { NextResponse } from "next/server";
import { analyzeACStatus, ROUTE_TYPE_TRAM } from "@/lib/analysis";

/**
 * Cached at the edge for 30 s, with SWR so requests after expiry return stale
 * data while revalidating in the background. On Cloudflare this deduplicates
 * concurrent requests globally, which is what actually protects the Golemio
 * API from our traffic — a per-isolate rate limiter would not. Clients poll
 * faster than the TTL; that's fine, they hit the cache. stale-if-error keeps
 * serving the last good payload during upstream outages.
 */
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300";
const ERROR_CACHE_CONTROL = "public, s-maxage=5";

export async function GET() {
  try {
    const analysis = await analyzeACStatus(ROUTE_TYPE_TRAM);
    return NextResponse.json(analysis, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    console.error("tram API failed", error);
    return NextResponse.json(
      { error: "Failed to fetch tram status" },
      { status: 500, headers: { "Cache-Control": ERROR_CACHE_CONTROL } },
    );
  }
}
