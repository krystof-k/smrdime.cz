import type { LineInfo } from "./vehicle-analysis";

export function filterLinesByQuery(lines: LineInfo[], query: string): LineInfo[] {
  const trimmed = query.trim();
  if (trimmed === "") return lines;
  return lines.filter((line) => line.lineNumber.startsWith(trimmed));
}
