"use client";

import { useState } from "react";
import { usePrefersDark } from "@/hooks/usePrefersDark";
import { useVehicleStatus } from "@/hooks/useVehicleStatus";
import { useWeather } from "@/hooks/useWeather";
import { DashboardView } from "./DashboardView";

export default function DashboardClient() {
  const [paused, setPaused] = useState(false);
  const tram = useVehicleStatus("/api/tram", { paused });
  const bus = useVehicleStatus("/api/bus", { paused });
  const temperature = useWeather({ paused });
  const isDark = usePrefersDark();

  // Use the most recent of the two refresh timestamps so a stalled upstream
  // doesn't freeze the clock while the other source keeps ticking.
  const lastUpdated = latest(tram.lastUpdated, bus.lastUpdated);

  return (
    <DashboardView
      tramData={tram.data}
      tramError={tram.error}
      onTramRetry={tram.refresh}
      busData={bus.data}
      busError={bus.error}
      onBusRetry={bus.refresh}
      lastUpdated={lastUpdated}
      paused={paused}
      onTogglePaused={() => setPaused((prev) => !prev)}
      temperature={temperature}
      isDark={isDark}
    />
  );
}

function latest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}
