import { AC_FLEET_TOTAL } from "@/lib/constants";
import { getTemperatureColor, NEUTRAL_TEXT_COLOR } from "@/lib/display";
import { percentWithoutAC, roundPercent } from "@/lib/ratios";
import type { TramAnalysisResult } from "@/lib/tram-analysis";
import { DppInfoPopover } from "./DppInfoPopover";
import { SkeletonBlock } from "./LoadingSkeleton";

type TramSummaryProps = {
  data: TramAnalysisResult | null;
  temperature: number | null;
  showPercentages: boolean;
};

export function TramSummary({ data, temperature, showPercentages }: TramSummaryProps) {
  const emphasisColor =
    temperature !== null ? getTemperatureColor(temperature) : NEUTRAL_TEXT_COLOR;
  // First emphasis ("80 z 120" / "67 % z 120") is inverted vs the headline so
  // both forms are on screen at once. The second emphasis ("ze všech 147")
  // follows the toggle directly — there's no headline counterpart for it.
  const summaryShowsPercentages = !showPercentages;

  return (
    <p className="mt-8 font-light text-gray-600 text-xl leading-relaxed md:text-2xl dark:text-gray-300">
      {data ? (
        <>
          To je{" "}
          {data.tramsWithoutAC === data.totalTrams ? (
            <span className={`font-black ${emphasisColor}`}>
              všech <span className="font-mono">{data.totalTrams}</span>
            </span>
          ) : summaryShowsPercentages ? (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{percentWithoutAC(data)}</span>{" "}
                <span className="font-mono">%</span>
              </span>{" "}
              z {data.totalTrams}
            </>
          ) : (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{data.tramsWithoutAC}</span>
              </span>{" "}
              z {data.totalTrams}
            </>
          )}{" "}
          tramvají, které jsou právě na trati a{" "}
          {showPercentages ? (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">{roundPercent(data.tramsWithAC, AC_FLEET_TOTAL)}</span>{" "}
              <span className="font-mono">%</span>
            </span>
          ) : (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">{data.tramsWithAC}</span>
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
          To je <SkeletonBlock /> z <SkeletonBlock /> tramvají, které jsou právě na trati a{" "}
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
