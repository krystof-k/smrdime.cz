"use client";

import { useState } from "react";
import { usePrefersDark } from "@/hooks/usePrefersDark";
import { useTramStatus } from "@/hooks/useTramStatus";
import { useWeather } from "@/hooks/useWeather";
import { TramStatusView } from "./TramStatusView";

export default function TramStatus() {
  const [paused, setPaused] = useState(false);
  const { data, error, lastUpdated, refresh } = useTramStatus({ paused });
  const temperature = useWeather({ paused });
  const isDark = usePrefersDark();

  return (
    <TramStatusView
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
