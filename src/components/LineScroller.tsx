"use client";

import { useEffect, useRef, useState } from "react";
import { filterLinesByQuery } from "@/lib/line-search";
import type { LineInfo } from "@/lib/vehicle-analysis";
import type { VehicleMode } from "@/lib/vehicle-modes";
import { LineCard } from "./LineCard";
import { LineSkeleton } from "./LoadingSkeleton";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type LineScrollerProps = {
  mode: VehicleMode;
  lines: LineInfo[] | null;
  temperature: number | null;
  isDark: boolean;
  showPercentages: boolean;
};

export function LineScroller({
  mode,
  lines,
  temperature,
  isDark,
  showPercentages,
}: LineScrollerProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();
  const visibleLines = lines ? filterLinesByQuery(sortedActiveLines(lines), query) : null;

  // Type-to-search: digits typed anywhere on the page open the search and
  // start filtering. Once the input mounts it autofocuses, so follow-up
  // keystrokes land in it natively.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!/^[0-9]$/.test(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, [contenteditable]")) return;
      // We append the digit ourselves — without this the browser would insert
      // it again into the freshly focused input.
      event.preventDefault();
      setQuery((prev) => prev + event.key);
      setSearchOpen(true);
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="mt-8">
      <div
        className="flex w-0 min-w-full gap-4 overflow-x-auto pr-4 pb-4 pl-4 md:pr-8 md:pl-8 lg:pr-12 lg:pl-12"
        style={{ scrollbarWidth: "thin" }}
      >
        <search
          className={`relative flex h-16 shrink-0 items-center gap-2 overflow-hidden rounded-2xl border border-gray-300/80 p-3 backdrop-blur-sm transition-[width] duration-200 dark:border-gray-600/60 ${
            searchOpen
              ? "w-40 bg-white/70 dark:bg-gray-800/70"
              : "w-16 bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/80"
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
            // The magnifier must not move when the card expands: collapsed it
            // sits at the center of the 64px square (x=32); expanded it gets a
            // fixed 40px box after the 12px padding, so its center stays at
            // 12 + 20 = 32.
            className={
              searchOpen
                ? "flex w-10 shrink-0 cursor-pointer items-center justify-center text-2xl"
                : // Cover the whole square so a click anywhere on it opens the search.
                  "absolute inset-0 flex cursor-pointer items-center justify-center text-2xl"
            }
          >
            🔍
          </button>
          {searchOpen && (
            <input
              ref={inputRef}
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
        </search>
        {!visibleLines
          ? SKELETON_KEYS.map((key) => <LineSkeleton key={key} />)
          : visibleLines.length > 0
            ? visibleLines.map((line) => (
                <LineCard
                  key={line.routeId}
                  mode={mode}
                  line={line}
                  temperature={temperature}
                  isDark={isDark}
                  showPercentages={showPercentages}
                />
              ))
            : trimmedQuery !== "" && (
                <p className="flex h-16 shrink-0 items-center font-mono text-gray-600 text-sm dark:text-gray-300">
                  Linka „{trimmedQuery}“ teď nejspíš nejezdí, nebo ji nesledujeme.
                </p>
              )}
      </div>
    </div>
  );
}

function sortedActiveLines(lines: LineInfo[]): LineInfo[] {
  return lines
    .filter((line) => line.totalVehicles > 0)
    .toSorted((a, b) => a.vehiclesWithAC / a.totalVehicles - b.vehiclesWithAC / b.totalVehicles);
}
