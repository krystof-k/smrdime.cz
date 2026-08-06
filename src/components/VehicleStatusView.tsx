"use client";

import { useEffect, useState } from "react";
import type { VehicleAnalysisResult } from "@/lib/vehicle-analysis";
import { VEHICLE_MODES, type VehicleMode } from "@/lib/vehicle-modes";
import { ErrorView } from "./ErrorView";
import { Footer } from "./Footer";
import { LineScroller } from "./LineScroller";
import { ModeSwitchLink } from "./ModeSwitchLink";
import { ShareButton } from "./ShareButton";
import { VehicleHeadline } from "./VehicleHeadline";
import { VehicleSummary } from "./VehicleSummary";

type VehicleStatusViewProps = {
  mode: VehicleMode;
  data: VehicleAnalysisResult | null;
  error: string | null;
  lastUpdated: Date | null;
  paused: boolean;
  onTogglePaused: () => void;
  temperature: number | null;
  isDark: boolean;
  onRetry: () => void;
};

export function VehicleStatusView({
  mode,
  data,
  error,
  lastUpdated,
  paused,
  onTogglePaused,
  temperature,
  isDark,
  onRetry,
}: VehicleStatusViewProps) {
  const [showPercentages, setShowPercentages] = useState(false);
  const [includeLayovers, setIncludeLayovers] = useState(false);
  const counts = data ? (includeLayovers ? data.inService : data.onTrack) : null;

  // Document-level tap-to-toggle. Lives off the JSX so the wrapper stays a
  // plain div — any click anywhere outside an interactive element flips the
  // mode. Keyboard/AT users get the visible toggle button below.
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('a, button, input, search, [role="tooltip"]')) return;
      setShowPercentages((prev) => !prev);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="grid min-h-screen cursor-pointer grid-rows-[1fr_auto] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <main className="flex flex-col justify-center">
        {error && !data ? (
          <ErrorView mode={mode} message={error} onRetry={onRetry} />
        ) : (
          <div className="text-left">
            <div className="grid gap-y-2 px-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6 md:gap-y-0 md:px-8 lg:px-12">
              <div className="md:col-start-2 md:row-start-1 md:justify-self-end md:self-start">
                <TopControls
                  mode={mode}
                  lastUpdated={lastUpdated}
                  paused={paused}
                  onTogglePaused={onTogglePaused}
                  showPercentages={showPercentages}
                  onToggleShowPercentages={() => setShowPercentages((prev) => !prev)}
                  includeLayovers={includeLayovers}
                  onToggleIncludeLayovers={() => setIncludeLayovers((prev) => !prev)}
                />
              </div>
              <div className="md:col-start-1 md:row-start-1">
                <VehicleHeadline
                  mode={mode}
                  counts={counts}
                  temperature={temperature}
                  showPercentages={showPercentages}
                />
                <VehicleSummary
                  mode={mode}
                  counts={counts}
                  temperature={temperature}
                  showPercentages={showPercentages}
                  includeLayovers={includeLayovers}
                />
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <ShareButton mode={mode} temperature={temperature} />
                  <ModeSwitchLink mode={mode} />
                </div>
              </div>
            </div>
            <LineScroller
              mode={mode}
              lines={counts?.lineDetails ?? null}
              temperature={temperature}
              isDark={isDark}
              showPercentages={showPercentages}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

type TopControlsProps = {
  mode: VehicleMode;
  lastUpdated: Date | null;
  paused: boolean;
  onTogglePaused: () => void;
  showPercentages: boolean;
  onToggleShowPercentages: () => void;
  includeLayovers: boolean;
  onToggleIncludeLayovers: () => void;
};

function TopControls({
  mode,
  lastUpdated,
  paused,
  onTogglePaused,
  showPercentages,
  onToggleShowPercentages,
  includeLayovers,
  onToggleIncludeLayovers,
}: TopControlsProps) {
  const { plural, onRouteLabel } = VEHICLE_MODES[mode];
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onToggleIncludeLayovers}
        aria-pressed={includeLayovers}
        aria-label={
          includeLayovers
            ? `Zobrazit jen ${plural} ${onRouteLabel}`
            : `Zahrnout i ${plural} na konečných`
        }
        className="cursor-pointer rounded px-1 font-mono text-gray-400 text-xs transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {includeLayovers ? `Jen ${onRouteLabel}` : "Včetně konečných"}
      </button>
      <span aria-hidden="true" className="text-gray-300 text-xs dark:text-gray-700">
        •
      </span>
      <button
        type="button"
        onClick={onToggleShowPercentages}
        aria-pressed={showPercentages}
        aria-label={
          showPercentages ? "Přepnout na zobrazení počtů" : "Přepnout na zobrazení procent"
        }
        className="cursor-pointer rounded px-1 font-mono text-gray-400 text-xs transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {showPercentages ? "Počty" : "Procenta"}
      </button>
      {lastUpdated && (
        <>
          <span aria-hidden="true" className="text-gray-300 text-xs dark:text-gray-700">
            •
          </span>
          <LastUpdated at={lastUpdated} paused={paused} onToggle={onTogglePaused} />
        </>
      )}
    </div>
  );
}

type LastUpdatedProps = { at: Date; paused: boolean; onToggle: () => void };

function LastUpdated({ at, paused, onToggle }: LastUpdatedProps) {
  const [hh, mm, ss] = at
    .toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .split(":");
  const colonClass = paused ? undefined : "clock-blink";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? "Obnovit automatické aktualizace" : "Pozastavit automatické aktualizace"}
      title={paused ? "Obnovit" : "Pozastavit"}
      className="group cursor-pointer rounded px-1 font-mono text-gray-400 text-xs tabular-nums transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      {paused && <span aria-hidden="true">⏸ </span>}
      {hh}
      <span className={colonClass}>:</span>
      {mm}
      <span className={colonClass}>:</span>
      {ss}
    </button>
  );
}
