import { AC_FLEET_TOTAL } from "@/lib/constants";
import { getTemperatureColor, NEUTRAL_TEXT_COLOR } from "@/lib/display";
import { percentWithoutAC, roundPercent } from "@/lib/ratios";
import type { TramCounts } from "@/lib/tram-analysis";
import { DppInfoPopover } from "./DppInfoPopover";
import { SkeletonBlock } from "./LoadingSkeleton";

type TramSummaryProps = {
  counts: TramCounts | null;
  temperature: number | null;
  showPercentages: boolean;
  includeLayovers: boolean;
};

export function TramSummary({
  counts,
  temperature,
  showPercentages,
  includeLayovers,
}: TramSummaryProps) {
  const emphasisColor =
    temperature !== null ? getTemperatureColor(temperature) : NEUTRAL_TEXT_COLOR;
  // First emphasis ("80 z 120" / "67 % z 120") is inverted vs the headline so
  // both forms are on screen at once. The second emphasis ("ze všech 147")
  // follows the toggle directly — there's no headline counterpart for it.
  const summaryShowsPercentages = !showPercentages;
  const scopeLabel = includeLayovers ? "v provozu" : "na trati";

  return (
    <p className="mt-8 font-light text-gray-600 text-xl leading-relaxed md:text-2xl dark:text-gray-300">
      {counts ? (
        <>
          To je{" "}
          {counts.tramsWithoutAC === counts.totalTrams ? (
            <span className={`font-black ${emphasisColor}`}>
              všech <span className="font-mono">{counts.totalTrams}</span>
            </span>
          ) : summaryShowsPercentages ? (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{percentWithoutAC(counts)}</span>{" "}
                <span className="font-mono">%</span>
              </span>{" "}
              z {counts.totalTrams}
            </>
          ) : (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{counts.tramsWithoutAC}</span>
              </span>{" "}
              z {counts.totalTrams}
            </>
          )}{" "}
          tramvají, které jsou právě {scopeLabel} a{" "}
          {showPercentages ? (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">{roundPercent(counts.tramsWithAC, AC_FLEET_TOTAL)}</span>{" "}
              <span className="font-mono">%</span>
            </span>
          ) : (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">{counts.tramsWithAC}</span>
            </span>
          )}{" "}
          ze všech {AC_FLEET_TOTAL} klimatizovaných tramvají.
          <sup>
            {" "}
            <DppInfoPopover />
          </sup>
        </>
      ) : (
        <>
          To je <SkeletonBlock /> z <SkeletonBlock /> tramvají, které jsou právě {scopeLabel} a{" "}
          <SkeletonBlock /> ze všech {AC_FLEET_TOTAL} klimatizovaných tramvají.
          <sup>
            {" "}
            <DppInfoPopover />
          </sup>
        </>
      )}
    </p>
  );
}
