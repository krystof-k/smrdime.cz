import type { TramLineInfo } from "@/lib/tram-analysis";
import { TramLineSkeleton } from "./LoadingSkeleton";
import { TramLineCard } from "./TramLineCard";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type TramLineScrollerProps = {
  lines: TramLineInfo[] | null;
  temperature: number | null;
  isDark: boolean;
  showPercentages: boolean;
};

export function TramLineScroller({
  lines,
  temperature,
  isDark,
  showPercentages,
}: TramLineScrollerProps) {
  return (
    <div className="mt-8">
      <div
        className="flex w-0 min-w-full gap-4 overflow-x-auto pr-4 pb-4 pl-4 md:pr-8 md:pl-8 lg:pr-12 lg:pl-12"
        style={{ scrollbarWidth: "thin" }}
      >
        {lines
          ? sortedActiveLines(lines).map((line) => (
              <TramLineCard
                key={line.routeId}
                line={line}
                temperature={temperature}
                isDark={isDark}
                showPercentages={showPercentages}
              />
            ))
          : SKELETON_KEYS.map((key) => <TramLineSkeleton key={key} />)}
      </div>
    </div>
  );
}

function sortedActiveLines(lines: TramLineInfo[]): TramLineInfo[] {
  return lines
    .filter((line) => line.totalVehicles > 0)
    .toSorted((a, b) => a.vehiclesWithAC / a.totalVehicles - b.vehiclesWithAC / b.totalVehicles);
}
