import type { VehicleAnalysisResult } from "./analysis.ts";

export function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function percentWithoutAC(data: VehicleAnalysisResult): number {
  return roundPercent(data.vehiclesWithoutAC, data.totalVehicles);
}
