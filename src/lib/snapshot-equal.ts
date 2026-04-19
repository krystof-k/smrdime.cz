import type { TramAnalysisResult, TramLineInfo } from "./tram-analysis.ts";

function linesEqual(a: TramLineInfo, b: TramLineInfo): boolean {
  return (
    a.routeId === b.routeId &&
    a.lineNumber === b.lineNumber &&
    a.totalVehicles === b.totalVehicles &&
    a.vehiclesWithAC === b.vehiclesWithAC &&
    a.vehiclesWithoutAC === b.vehiclesWithoutAC &&
    a.status === b.status &&
    a.error === b.error
  );
}

/**
 * Equality by observable content, ignoring `lastUpdated`. The poll clock ticks
 * every 30 s but the underlying data only changes when a tram starts or ends a
 * trip — this lets the hub skip broadcasts when nothing that users care about
 * has moved.
 */
export function snapshotsEqual(
  a: TramAnalysisResult | null,
  b: TramAnalysisResult | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.totalTrams !== b.totalTrams) return false;
  if (a.tramsWithAC !== b.tramsWithAC) return false;
  if (a.tramsWithoutAC !== b.tramsWithoutAC) return false;
  if (a.lineDetails.length !== b.lineDetails.length) return false;
  for (let i = 0; i < a.lineDetails.length; i += 1) {
    if (!linesEqual(a.lineDetails[i], b.lineDetails[i])) return false;
  }
  return true;
}
