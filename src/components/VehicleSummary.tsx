import { AC_FLEET_TOTAL } from "@/lib/constants";
import { getTemperatureColor, NEUTRAL_TEXT_COLOR } from "@/lib/display";
import { percentWithoutAC, roundPercent } from "@/lib/ratios";
import type { VehicleCounts } from "@/lib/vehicle-analysis";
import { VEHICLE_MODES, type VehicleMode } from "@/lib/vehicle-modes";
import { DppInfoPopover } from "./DppInfoPopover";
import { SkeletonBlock } from "./LoadingSkeleton";

type VehicleSummaryProps = {
  mode: VehicleMode;
  counts: VehicleCounts | null;
  temperature: number | null;
  showPercentages: boolean;
  includeLayovers: boolean;
};

export function VehicleSummary({
  mode,
  counts,
  temperature,
  showPercentages,
  includeLayovers,
}: VehicleSummaryProps) {
  const { genitive, onRouteLabel } = VEHICLE_MODES[mode];
  const emphasisColor =
    temperature !== null ? getTemperatureColor(temperature) : NEUTRAL_TEXT_COLOR;
  // First emphasis ("80 z 120" / "67 % z 120") is inverted vs the headline so
  // both forms are on screen at once. The second emphasis ("ze všech 147")
  // follows the toggle directly — there's no headline counterpart for it.
  const summaryShowsPercentages = !showPercentages;
  const scopeLabel = includeLayovers ? "v provozu" : onRouteLabel;

  // DPP publishes a verified AC-equipped fleet count for trams only, so the
  // "ze všech N klimatizovaných" clause has nothing to cite in bus mode.
  const fleetClause =
    mode === "tram" ? (
      <>
        {" "}
        a{" "}
        {counts ? (
          showPercentages ? (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">
                {roundPercent(counts.vehiclesWithAC, AC_FLEET_TOTAL)}
              </span>{" "}
              <span className="font-mono">%</span>
            </span>
          ) : (
            <span className={`font-black ${emphasisColor}`}>
              <span className="font-mono">{counts.vehiclesWithAC}</span>
            </span>
          )
        ) : (
          <SkeletonBlock />
        )}{" "}
        ze všech {AC_FLEET_TOTAL} klimatizovaných tramvají.
        <sup>
          {" "}
          <DppInfoPopover mode="tram" />
        </sup>
      </>
    ) : (
      <>
        .
        <sup>
          {" "}
          <DppInfoPopover mode="bus" />
        </sup>
      </>
    );

  return (
    <p className="mt-8 font-light text-gray-600 text-xl leading-relaxed md:text-2xl dark:text-gray-300">
      {counts ? (
        <>
          To je{" "}
          {counts.vehiclesWithoutAC === counts.totalVehicles ? (
            <span className={`font-black ${emphasisColor}`}>
              všech <span className="font-mono">{counts.totalVehicles}</span>
            </span>
          ) : summaryShowsPercentages ? (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{percentWithoutAC(counts)}</span>{" "}
                <span className="font-mono">%</span>
              </span>{" "}
              z {counts.totalVehicles}
            </>
          ) : (
            <>
              <span className={`font-black ${emphasisColor}`}>
                <span className="font-mono">{counts.vehiclesWithoutAC}</span>
              </span>{" "}
              z {counts.totalVehicles}
            </>
          )}{" "}
          {genitive}, které jsou právě {scopeLabel}
          {fleetClause}
        </>
      ) : (
        <>
          To je <SkeletonBlock /> z <SkeletonBlock /> {genitive}, které jsou právě {scopeLabel}
          {fleetClause}
        </>
      )}
    </p>
  );
}
