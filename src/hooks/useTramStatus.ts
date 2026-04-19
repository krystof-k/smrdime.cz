"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";
import type { TramAnalysisResult } from "@/lib/tram-analysis";
import { usePageVisible } from "./usePageVisible";

export type TramStatusState = {
  data: TramAnalysisResult | null;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

export function useTramStatus({ paused = false }: { paused?: boolean } = {}): TramStatusState {
  const [data, setData] = useState<TramAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlightController = useRef<AbortController | null>(null);
  const visible = usePageVisible();

  const refresh = useCallback(async () => {
    inFlightController.current?.abort();
    const controller = new AbortController();
    inFlightController.current = controller;

    try {
      const response = await fetch("/api/tram", { signal: controller.signal });
      if (!response.ok) throw new Error("Failed to fetch tram status");
      const payload = (await response.json()) as TramAnalysisResult;
      if (controller.signal.aborted) return;
      setData(payload);
      setError(null);
      setLastUpdated(new Date(payload.lastUpdated));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

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
