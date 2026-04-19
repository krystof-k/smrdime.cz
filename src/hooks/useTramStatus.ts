"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TramAnalysisResult } from "@/lib/tram-analysis";
import { usePageVisible } from "./usePageVisible";

export type TramStatusState = {
  data: TramAnalysisResult | null;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

type UseTramStatusOptions = {
  paused?: boolean;
  initialSnapshot?: TramAnalysisResult | null;
};

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function streamUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/tram/stream`;
}

/**
 * Subscribes to the TramStatusHub Durable Object over a single WebSocket.
 * The socket is closed when the tab is hidden or the user pauses updates,
 * which is what lets the hub stop polling upstream while nobody is watching.
 */
export function useTramStatus({
  paused = false,
  initialSnapshot = null,
}: UseTramStatusOptions = {}): TramStatusState {
  const [data, setData] = useState<TramAnalysisResult | null>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialSnapshot ? new Date(initialSnapshot.lastUpdated) : null,
  );
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const visible = usePageVisible();

  const applyPayload = useCallback((raw: string) => {
    try {
      const payload = JSON.parse(raw) as TramAnalysisResult;
      setData(payload);
      setError(null);
      setLastUpdated(new Date(payload.lastUpdated));
    } catch {
      setError("Neplatná data z WebSocketu");
    }
  }, []);

  useEffect(() => {
    if (paused || !visible) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const socket = new WebSocket(streamUrl());
      socketRef.current = socket;
      let opened = false;

      socket.addEventListener("open", () => {
        opened = true;
        reconnectAttemptRef.current = 0;
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") applyPayload(event.data);
      });
      socket.addEventListener("close", () => {
        if (cancelled) return;
        if (!opened) setError((prev) => prev ?? "WebSocket spojení selhalo");
        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current = attempt + 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
        reconnectTimerRef.current = setTimeout(connect, delay);
      });
      socket.addEventListener("error", () => {
        setError((prev) => prev ?? "WebSocket spojení selhalo");
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close(1000, "unmount");
      }
    };
  }, [applyPayload, paused, visible]);

  const refresh = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) return;
    // Reset backoff so the next reconnect attempt fires quickly after the
    // user taps "Retry".
    reconnectAttemptRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socket?.close();
  }, []);

  return { data, error, lastUpdated, refresh };
}
