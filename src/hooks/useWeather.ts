"use client";

import { useEffect, useState } from "react";
import { WEATHER_REFRESH_INTERVAL_MS } from "@/lib/constants";
import { usePageVisible } from "./usePageVisible";

// Null return means "unknown" (not "hot") — the UI uses a neutral color in that case.
export function useWeather({ paused = false }: { paused?: boolean } = {}): number | null {
  const [temperature, setTemperature] = useState<number | null>(null);
  const visible = usePageVisible();

  useEffect(() => {
    if (paused || !visible) return;
    const fetchWeather = async () => {
      try {
        const response = await fetch("/api/weather");
        if (!response.ok) return;
        const result = (await response.json()) as { temperature: number };
        setTemperature(result.temperature);
      } catch (error) {
        console.warn("Weather fetch failed, keeping last known value", error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, WEATHER_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [paused, visible]);

  return temperature;
}
