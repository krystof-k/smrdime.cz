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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const visibleLines = lines ? filterLinesByQuery(sortedActiveLines(lines), query) : null;

  return (
    <div className="mt-8">
      <div
        className="flex w-0 min-w-full gap-4 overflow-x-auto pr-4 pb-4 pl-4 md:pr-8 md:pl-8 lg:pr-12 lg:pl-12"
        style={{ scrollbarWidth: "thin" }}
      >
        <div
          className={`flex h-16 shrink-0 items-center gap-2 overflow-hidden rounded-2xl p-3 backdrop-blur-sm transition-[width] duration-200 ${
            searchOpen
              ? "w-40 bg-white/70 dark:bg-gray-800/70"
              : "w-14 bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/80"
          }`}
        >
          <button
            type="button"
            // Keep the input's focus so its blur-close doesn't race the click.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (searchOpen) setQuery("");
              setSearchOpen(!searchOpen);
            }}
            aria-label={searchOpen ? "Zavřít hledání" : "Hledat linku"}
            aria-expanded={searchOpen}
            className="shrink-0 cursor-pointer text-2xl"
          >
            🔍
          </button>
          {searchOpen && (
            <input
              // biome-ignore lint/a11y/noAutofocus: the input appears on user request; focusing it is the point
              autoFocus
              type="search"
              inputMode="numeric"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => {
                if (trimmedQuery === "") setSearchOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  setSearchOpen(false);
                }
              }}
              placeholder="Linka"
              aria-label="Hledat linku"
              className="w-full min-w-0 bg-transparent font-black font-mono text-gray-800 text-xl outline-none placeholder:font-normal placeholder:text-base placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
            />
          )}
        </div>
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
