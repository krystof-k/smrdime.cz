import type { VehicleCounts } from "./vehicle-analysis.ts";

export function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function percentWithoutAC(counts: VehicleCounts): number {
  return roundPercent(counts.vehiclesWithoutAC, counts.totalVehicles);
}
