import type { VehicleAnalysisResult } from "@/lib/analysis";
import { getTemperatureColor, NEUTRAL_TEXT_COLOR } from "@/lib/display";
import { percentWithoutAC } from "@/lib/ratios";
import { SkeletonBlock } from "./LoadingSkeleton";

type BusHeadlineProps = {
  data: VehicleAnalysisResult | null;
  temperature: number | null;
  showPercentages: boolean;
};

export function BusHeadline({ data, temperature, showPercentages }: BusHeadlineProps) {
  const tempColor = temperature !== null ? getTemperatureColor(temperature) : NEUTRAL_TEXT_COLOR;
  const countClass = `font-black font-mono inline-block ${data ? tempColor : ""}`;

  return (
    <h1 className="text-5xl text-gray-800 leading-tight md:text-6xl lg:text-7xl dark:text-gray-100">
      <span className="font-thin">A jezdí</span>{" "}
      <span className={countClass} style={{ minHeight: "1.2em" }}>
        {data ? (
          showPercentages ? (
            <>
              {percentWithoutAC(data)}
              <span className="font-sans">&nbsp;</span>%
            </>
          ) : (
            data.vehiclesWithoutAC
          )
        ) : (
          <SkeletonBlock />
        )}
      </span>{" "}
      <span className="font-thin">autobusů</span> 🚌{" "}
      <span className="font-black">bez klimatizace</span>.
    </h1>
  );
}
