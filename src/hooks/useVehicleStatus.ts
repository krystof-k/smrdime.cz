"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VehicleAnalysisResult } from "@/lib/analysis";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";
import { usePageVisible } from "./usePageVisible";

export type VehicleEndpoint = "/api/tram" | "/api/bus";

export type VehicleStatusState = {
  data: VehicleAnalysisResult | null;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

export function useVehicleStatus(
  endpoint: VehicleEndpoint,
  { paused = false }: { paused?: boolean } = {},
): VehicleStatusState {
  const [data, setData] = useState<VehicleAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlightController = useRef<AbortController | null>(null);
  const visible = usePageVisible();

  const refresh = useCallback(async () => {
    inFlightController.current?.abort();
    const controller = new AbortController();
    inFlightController.current = controller;

    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
      const payload = (await response.json()) as VehicleAnalysisResult;
      if (controller.signal.aborted) return;
      setData(payload);
      setError(null);
      setLastUpdated(new Date(payload.lastUpdated));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, [endpoint]);

  useEffect(() => {
    if (paused || !visible) return;
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      inFlightController.current?.abort();
    };
  }, [refresh, paused, visible]);

  return { data, error, lastUpdated, refresh };
}
