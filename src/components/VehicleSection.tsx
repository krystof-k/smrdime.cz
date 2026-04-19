"use client";

import type { VehicleAnalysisResult } from "@/lib/analysis";
import { ErrorView } from "./ErrorView";
import { LineScroller } from "./LineScroller";

type VehicleSectionProps = {
  kind: "tram" | "bus";
  data: VehicleAnalysisResult | null;
  error: string | null;
  onRetry: () => void;
  temperature: number | null;
  isDark: boolean;
  showPercentages: boolean;
  coolEmoji: string;
  headline: React.ReactNode;
  summary: React.ReactNode;
};

export function VehicleSection({
  kind,
  data,
  error,
  onRetry,
  temperature,
  isDark,
  showPercentages,
  coolEmoji,
  headline,
  summary,
}: VehicleSectionProps) {
  if (error && !data) {
    return <ErrorView message={error} onRetry={onRetry} kind={kind} />;
  }

  return (
    <div className="text-left">
      <div className="px-4 md:px-8 lg:px-12">
        {headline}
        {summary}
      </div>
      <LineScroller
        lines={data?.lineDetails ?? null}
        temperature={temperature}
        isDark={isDark}
        showPercentages={showPercentages}
        coolEmoji={coolEmoji}
      />
    </div>
  );
}
