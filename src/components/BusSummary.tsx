import type { VehicleAnalysisResult } from "@/lib/analysis";
import { AC_FLEET_BUS_TOTAL } from "@/lib/constants";
import { getTemperatureColor, NEUTRAL_TEXT_COLOR } from "@/lib/display";
import { percentWithoutAC, roundPercent } from "@/lib/ratios";
import { BusDppInfoPopover } from "./BusDppInfoPopover";
import { SkeletonBlock } from "./LoadingSkeleton";

type BusSummaryProps = {
  data: VehicleAnalysisResult | null;
  temperature: number | null;
  showPercentages: boolean;
};

export function BusSummary({ data, temperature, showPercentages }: BusSummaryProps) {
  const emphasisColor =
    temperature !== null ? getTemperatureColor(temperature) : NEUTRAL_TEXT_COLOR;
  const summaryShowsPercentages = !showPercentages;

  return (
    <p className="mt-8 font-light text-gray-600 text-xl leading-relaxed md:text-2xl dark:text-gray-300">
      {data ? (
        <>
          To je{" "}
          {data.vehiclesWithoutAC === data.totalVehicles ? (
            <span className={`font-black ${emphasisColor}`}>
              všech <span className="font-mono">{data.totalVehicles}</span>
            </span>
          ) : summaryShowsPercentages ? (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{percentWithoutAC(data)}</span>{" "}
                <span className="font-mono">%</span>
              </span>{" "}
              z {data.totalVehicles}
            </>
          ) : (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{data.vehiclesWithoutAC}</span>
              </span>{" "}
              z {data.totalVehicles}
            </>
          )}{" "}
          autobusů, které jsou právě na trati a{" "}
          {showPercentages ? (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">
                {roundPercent(data.vehiclesWithAC, AC_FLEET_BUS_TOTAL)}
              </span>{" "}
              <span className="font-mono">%</span>
            </span>
          ) : (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">{data.vehiclesWithAC}</span>
            </span>
          )}{" "}
          ze všech {AC_FLEET_BUS_TOTAL} klimatizovaných autobusů.
          <sup>
            {" "}
            <BusDppInfoPopover />
          </sup>
        </>
      ) : (
        <>
          To je <SkeletonBlock /> z <SkeletonBlock /> autobusů, které jsou právě na trati a{" "}
          <SkeletonBlock /> ze všech {AC_FLEET_BUS_TOTAL} klimatizovaných autobusů.
          <sup>
            {" "}
            <BusDppInfoPopover />
          </sup>
        </>
      )}
    </p>
  );
}
