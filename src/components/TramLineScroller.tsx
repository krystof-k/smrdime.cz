"use client";

import { useState } from "react";
import { filterLinesByQuery } from "@/lib/line-search";
import type { TramLineInfo } from "@/lib/tram-analysis";
import { TramLineSkeleton } from "./LoadingSkeleton";
import { TramLineCard } from "./TramLineCard";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type TramLineScrollerProps = {
  lines: TramLineInfo[] | null;
  temperature: number | null;
  isDark: boolean;
  showPercentages: boolean;
};

export function TramLineScroller({
  lines,
  temperature,
  isDark,
  showPercentages,
}: TramLineScrollerProps) {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const visibleLines = lines ? filterLinesByQuery(sortedActiveLines(lines), query) : null;

  return (
    <div className="mt-8">
      <div className="px-4 md:px-8 lg:px-12">
        <input
          type="search"
          inputMode="numeric"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hledat linku…"
          aria-label="Hledat linku"
          className="h-9 w-40 rounded-xl bg-white/60 px-3 font-mono text-gray-700 text-sm backdrop-blur-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800/60 dark:text-gray-200 dark:placeholder:text-gray-500"
        />
      </div>
      <div
        className="mt-3 flex w-0 min-w-full gap-4 overflow-x-auto pr-4 pb-4 pl-4 md:pr-8 md:pl-8 lg:pr-12 lg:pl-12"
        style={{ scrollbarWidth: "thin" }}
      >
        {!visibleLines
          ? SKELETON_KEYS.map((key) => <TramLineSkeleton key={key} />)
          : visibleLines.length > 0
            ? visibleLines.map((line) => (
                <TramLineCard
                  key={line.routeId}
                  line={line}
                  temperature={temperature}
                  isDark={isDark}
                  showPercentages={showPercentages}
                />
              ))
            : trimmedQuery !== "" && (
                <p className="flex h-16 shrink-0 items-center font-mono text-gray-600 text-sm dark:text-gray-300">
                  Linka „{trimmedQuery}“ teď nejspíš nejezdí.
                </p>
              )}
      </div>
    </div>
  );
}

function sortedActiveLines(lines: TramLineInfo[]): TramLineInfo[] {
  return lines
    .filter((line) => line.totalVehicles > 0)
    .toSorted((a, b) => a.vehiclesWithAC / a.totalVehicles - b.vehiclesWithAC / b.totalVehicles);
}
