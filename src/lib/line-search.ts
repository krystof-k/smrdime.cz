import type { TramLineInfo } from "./tram-analysis";

export function filterLinesByQuery(lines: TramLineInfo[], query: string): TramLineInfo[] {
  const trimmed = query.trim();
  if (trimmed === "") return lines;
  return lines.filter((line) => line.lineNumber.startsWith(trimmed));
}
