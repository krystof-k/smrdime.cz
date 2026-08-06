"use client";

import { useState } from "react";
import { usePrefersDark } from "@/hooks/usePrefersDark";
import { useVehicleStatus } from "@/hooks/useVehicleStatus";
import { useWeather } from "@/hooks/useWeather";
import type { VehicleMode } from "@/lib/vehicle-modes";
import { VehicleStatusView } from "./VehicleStatusView";

export default function VehicleStatus({ mode }: { mode: VehicleMode }) {
  const [paused, setPaused] = useState(false);
  const { data, error, lastUpdated, refresh } = useVehicleStatus(mode, { paused });
  const temperature = useWeather({ paused });
  const isDark = usePrefersDark();

  return (
    <VehicleStatusView
      mode={mode}
      data={data}
      error={error}
      lastUpdated={lastUpdated}
      paused={paused}
      onTogglePaused={() => setPaused((prev) => !prev)}
      temperature={temperature}
      isDark={isDark}
      onRetry={refresh}
    />
  );
}
