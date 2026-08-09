"use client";

import { useState } from "react";
import { getTemperatureHex, NEUTRAL_HEX } from "@/lib/display";
import { buildOgImagePath, buildShareUrl } from "@/lib/share";
import { VEHICLE_MODES, type VehicleMode } from "@/lib/vehicle-modes";

const SHARE_TITLE = "Smrdíme?";

// Shared by the share button and the mode-switch link so the action row reads
// as one control family; each button brings its own colors on top.
export const ACTION_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-lg border-2 px-5 py-2.5 font-medium font-mono text-base transition-colors";

export function ShareButton({
  mode,
  temperature,
}: {
  mode: VehicleMode;
  temperature: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const { path, shareText } = VEHICLE_MODES[mode];
  // Tie the button to the live temperature accent, like the headline numbers.
  const accent = temperature !== null ? getTemperatureHex(temperature) : NEUTRAL_HEX;

  async function handleShare() {
    // Fresh token per click so the shared link is a new URL the crawler hasn't
    // cached yet (see buildShareUrl).
    const token = Date.now();
    const url = buildShareUrl(token, path);

    // Render the card for this exact share URL now, so a scraper arriving
    // later finds it already done — a cold render can exceed scraper timeouts.
    // The cache /og writes to is per colo, so this only lands the finished PNG
    // for scrapers resolving to the same one; elsewhere it still re-renders.
    // keepalive lets the request finish even if the user navigates off to the
    // share sheet.
    fetch(buildOgImagePath(mode, token.toString(36)), { keepalive: true }).catch(() => {});

    // Native share sheet on mobile; clipboard everywhere else.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_TITLE, text: shareText, url });
      } catch {
        // user dismissed the sheet — nothing to do
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — graceful no-op
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      style={{ color: accent, borderColor: accent }}
      className={`${ACTION_BUTTON_CLASS} hover:bg-gray-50 dark:hover:bg-white/5`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "Zkopírováno" : "Sdílet"}
    </button>
  );
}
