"use client";

import { useEffect, useState } from "react";
import type { VehicleAnalysisResult } from "@/lib/analysis";
import { BusHeadline } from "./BusHeadline";
import { BusSummary } from "./BusSummary";
import { Footer } from "./Footer";
import { TramHeadline } from "./TramHeadline";
import { TramSummary } from "./TramSummary";
import { VehicleSection } from "./VehicleSection";

type DashboardViewProps = {
  tramData: VehicleAnalysisResult | null;
  tramError: string | null;
  onTramRetry: () => void;
  busData: VehicleAnalysisResult | null;
  busError: string | null;
  onBusRetry: () => void;
  lastUpdated: Date | null;
  paused: boolean;
  onTogglePaused: () => void;
  temperature: number | null;
  isDark: boolean;
};

export function DashboardView({
  tramData,
  tramError,
  onTramRetry,
  busData,
  busError,
  onBusRetry,
  lastUpdated,
  paused,
  onTogglePaused,
  temperature,
  isDark,
}: DashboardViewProps) {
  const [showPercentages, setShowPercentages] = useState(false);

  // Document-level tap-to-toggle. Lives off the JSX so the wrapper stays a
  // plain div — any click anywhere outside an interactive element flips the
  // mode. Keyboard/AT users get the visible toggle button below.
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('a, button, input, [role="tooltip"]')) return;
      setShowPercentages((prev) => !prev);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="grid min-h-screen cursor-pointer grid-rows-[1fr_auto] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <main className="flex flex-col">
        <div className="grid gap-y-2 px-4 pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6 md:gap-y-0 md:px-8 md:pt-6 lg:px-12">
          <div className="md:col-start-2 md:row-start-1 md:justify-self-end md:self-start">
            <TopControls
              lastUpdated={lastUpdated}
              paused={paused}
              onTogglePaused={onTogglePaused}
              showPercentages={showPercentages}
              onToggleShowPercentages={() => setShowPercentages((prev) => !prev)}
            />
          </div>
        </div>
        <section className="flex flex-1 flex-col justify-center py-12">
          <VehicleSection
            kind="tram"
            data={tramData}
            error={tramError}
            onRetry={onTramRetry}
            temperature={temperature}
            isDark={isDark}
            showPercentages={showPercentages}
            coolEmoji="🚋"
            headline={
              <TramHeadline
                data={tramData}
                temperature={temperature}
                showPercentages={showPercentages}
              />
            }
            summary={
              <TramSummary
                data={tramData}
                temperature={temperature}
                showPercentages={showPercentages}
              />
            }
          />
        </section>
        <section className="flex flex-1 flex-col justify-center border-slate-200/70 border-t bg-white/40 py-12 dark:border-slate-800/70 dark:bg-slate-900/30">
          <VehicleSection
            kind="bus"
            data={busData}
            error={busError}
            onRetry={onBusRetry}
            temperature={temperature}
            isDark={isDark}
            showPercentages={showPercentages}
            coolEmoji="🚌"
            headline={
              <BusHeadline
                data={busData}
                temperature={temperature}
                showPercentages={showPercentages}
              />
            }
            summary={
              <BusSummary
                data={busData}
                temperature={temperature}
                showPercentages={showPercentages}
              />
            }
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}

type TopControlsProps = {
  lastUpdated: Date | null;
  paused: boolean;
  onTogglePaused: () => void;
  showPercentages: boolean;
  onToggleShowPercentages: () => void;
};

function TopControls({
  lastUpdated,
  paused,
  onTogglePaused,
  showPercentages,
  onToggleShowPercentages,
}: TopControlsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
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
