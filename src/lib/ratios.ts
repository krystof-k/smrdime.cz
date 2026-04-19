import type { TramAnalysisResult } from "./tram-analysis.ts";

export function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function percentWithoutAC(data: TramAnalysisResult): number {
  return roundPercent(data.tramsWithoutAC, data.totalTrams);
}
