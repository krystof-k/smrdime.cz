import type { LineInfo } from "@/lib/analysis";
import { LineCard } from "./LineCard";
import { LineSkeleton } from "./LoadingSkeleton";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type LineScrollerProps = {
  lines: LineInfo[] | null;
  temperature: number | null;
  isDark: boolean;
  showPercentages: boolean;
  coolEmoji: string;
};

export function LineScroller({
  lines,
  temperature,
  isDark,
  showPercentages,
  coolEmoji,
}: LineScrollerProps) {
  return (
    <div className="mt-8">
      <div
        className="flex w-0 min-w-full gap-4 overflow-x-auto pr-4 pb-4 pl-4 md:pr-8 md:pl-8 lg:pr-12 lg:pl-12"
        style={{ scrollbarWidth: "thin" }}
      >
        {lines
          ? sortedActiveLines(lines).map((line) => (
              <LineCard
                key={line.routeId}
                line={line}
                temperature={temperature}
                isDark={isDark}
                showPercentages={showPercentages}
                coolEmoji={coolEmoji}
              />
            ))
          : SKELETON_KEYS.map((key) => <LineSkeleton key={key} />)}
      </div>
    </div>
  );
}

function sortedActiveLines(lines: LineInfo[]): LineInfo[] {
  return lines
    .filter((line) => line.totalVehicles > 0)
    .toSorted((a, b) => a.vehiclesWithAC / a.totalVehicles - b.vehiclesWithAC / b.totalVehicles);
}
