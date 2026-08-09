"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import {
  AC_BUS_FLEET_SHARE,
  AC_BUS_FLEET_SHARE_DATE,
  AC_FLEET_15T_FACTORY,
  AC_FLEET_52T,
  AC_RETROFITTED_15T,
  DPP_52T_URL,
  DPP_AC_FAQ_URL,
  DPP_RETROFIT_URL,
} from "@/lib/constants";
import type { VehicleMode } from "@/lib/vehicle-modes";

const CLOSE_DELAY_MS = 200;

/**
 * `popover="auto"` gives us free Escape + outside-click dismissal, but the
 * element enters the top layer on open, where `position: absolute` no longer
 * anchors to a DOM ancestor. We pin it to the trigger button with fixed
 * coordinates computed from getBoundingClientRect, refreshed on scroll/resize.
 */
export function DppInfoPopover({ mode }: { mode: VehicleMode }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    const pop = popoverRef.current;
    if (!btn || !pop) return;
    const rect = btn.getBoundingClientRect();
    pop.style.right = `${Math.max(0, window.innerWidth - rect.right)}px`;
    pop.style.bottom = `${Math.max(0, window.innerHeight - rect.top)}px`;
  }, []);

  const openNow = useCallback(() => {
    cancelClose();
    updatePosition();
    popoverRef.current?.showPopover();
  }, [cancelClose, updatePosition]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => popoverRef.current?.hidePopover(), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    const pop = popoverRef.current;
    if (!pop) return;
    const onScrollOrResize = () => {
      if (pop.matches(":popover-open")) updatePosition();
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [updatePosition]);

  const linkClass =
    "-mx-0.5 rounded px-0.5 font-mono underline decoration-dotted transition-all hover:decoration-solid hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950 dark:hover:text-rose-300";

  return (
    <span className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-describedby={popoverId}
        // Always open on click (desktop users hover first, so a toggle would
        // flip back to closed; touch users tap-outside to dismiss instead).
        onClick={openNow}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className="-mx-0.5 rounded px-0.5 font-mono text-gray-500 text-xs underline decoration-dotted transition-colors hover:text-gray-700 hover:decoration-solid dark:text-gray-400 dark:hover:text-gray-200"
      >
        dpp.cz
      </button>
      {/* Outer wrapper has generous padding to create a forgiving hover zone
          between the trigger button and the visible popover box. Reset every
          UA default the `[popover]` selector injects (fixed-pos in the top
          layer + inset/margin/border). */}
      <span
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        role="tooltip"
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className="dpp-popover"
      >
        <span className="block w-72 px-4 pt-4 pb-2">
          <span className="block rounded-lg border border-gray-200 bg-white p-3 text-left font-normal text-gray-700 text-sm leading-normal shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            {mode === "tram" ? (
              <>
                Podle{" "}
                <a
                  href={DPP_AC_FAQ_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  DPP
                </a>{" "}
                má klimatizaci <span className="font-mono">{AC_FLEET_15T_FACTORY}</span> tramvají{" "}
                <span className="whitespace-nowrap">Škoda 15T</span> z druhé dodávky, k tomu{" "}
                <a
                  href={DPP_RETROFIT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  doklimatizované
                </a>{" "}
                starší 15T (zatím <span className="font-mono">{AC_RETROFITTED_15T.length}</span>) a
                nové{" "}
                <a
                  href={DPP_52T_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Škoda 52T
                </a>{" "}
                (zatím <span className="font-mono">{AC_FLEET_52T}</span>). Rostoucí počty průběžně
                doplňujeme podle živého provozu.
              </>
            ) : (
              <>
                Počítáme jen městské linky PID včetně trolejbusů, příměstské ne. Kromě DPP je jezdí
                i smluvní dopravci PID. Podle{" "}
                <a
                  href={DPP_AC_FAQ_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  DPP
                </a>{" "}
                bylo k {AC_BUS_FLEET_SHARE_DATE} plně klimatizovaných{" "}
                <span className="whitespace-nowrap">
                  <span className="font-mono">{AC_BUS_FLEET_SHARE}</span>{" "}
                  <span className="font-mono">%</span>
                </span>{" "}
                autobusů jeho vozového parku.
              </>
            )}
          </span>
        </span>
      </span>
    </span>
  );
}
