import { getTemperatureColor, getTemperatureEmoji, NEUTRAL_TEXT_COLOR } from "@/lib/display";
import { percentWithoutAC } from "@/lib/ratios";
import type { VehicleCounts } from "@/lib/vehicle-analysis";
import { VEHICLE_MODES, type VehicleMode } from "@/lib/vehicle-modes";
import { SkeletonBlock } from "./LoadingSkeleton";

type VehicleHeadlineProps = {
  mode: VehicleMode;
  counts: VehicleCounts | null;
  temperature: number | null;
  showPercentages: boolean;
};

export function VehicleHeadline({
  mode,
  counts,
  temperature,
  showPercentages,
}: VehicleHeadlineProps) {
  const { genitive, emoji } = VEHICLE_MODES[mode];
  const tempColor = temperature !== null ? getTemperatureColor(temperature) : NEUTRAL_TEXT_COLOR;
  const countClass = `font-black font-mono inline-block ${counts ? tempColor : ""}`;

  return (
    <h1 className="text-5xl text-gray-800 leading-tight md:text-6xl lg:text-7xl dark:text-gray-100">
      {temperature !== null ? (
        <>
          V <span className="font-black">Praze</span> <span className="font-thin">je</span>{" "}
          <span className={`font-black font-mono ${getTemperatureColor(temperature)}`}>
            {temperature}°C
          </span>{" "}
          {getTemperatureEmoji(temperature)}
          <br />
          <span className="font-thin">a jezdí</span>{" "}
        </>
      ) : (
        <>
          V <span className="font-black">Praze</span> <span className="font-thin">jezdí</span>{" "}
        </>
      )}
      <span className={countClass} style={{ minHeight: "1.2em" }}>
        {counts ? (
          showPercentages ? (
            <>
              {percentWithoutAC(counts)}
              <span className="font-sans">&nbsp;</span>%
            </>
          ) : (
            counts.vehiclesWithoutAC
          )
        ) : (
          <SkeletonBlock />
        )}
      </span>{" "}
      <span className="font-thin">{genitive}</span> {emoji}
      <br />
      <span className="font-black">bez klimatizace</span>.
    </h1>
  );
}
