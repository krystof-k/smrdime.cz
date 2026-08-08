import { NextResponse } from "next/server";
import { analyzeACStatus } from "./vehicle-analysis";
import type { VehicleMode } from "./vehicle-modes";

/**
 * Advisory for any shared cache in front of us (`s-maxage` is ignored by
 * browsers by definition). It does *not* populate Cloudflare's edge cache — a
 * Worker response isn't stored there — so it protects nothing upstream.
 * Golemio is protected by the edge-cached subrequest in `getVehiclePositions`;
 * keep the 30 s here in step with it.
 */
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300";
const ERROR_CACHE_CONTROL = "public, s-maxage=5";

export function createStatusHandler(mode: VehicleMode): () => Promise<NextResponse> {
  return async () => {
    try {
      const analysis = await analyzeACStatus(mode);
      return NextResponse.json(analysis, {
        headers: { "Cache-Control": CACHE_CONTROL },
      });
    } catch (error) {
      console.error(`${mode} API failed`, error);
      return NextResponse.json(
        { error: "Failed to fetch vehicle status" },
        { status: 500, headers: { "Cache-Control": ERROR_CACHE_CONTROL } },
      );
    }
  };
}
