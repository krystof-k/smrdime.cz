"use client";

import { useState } from "react";
import { getTemperatureHex, NEUTRAL_HEX } from "@/lib/display";
import { buildShareUrl } from "@/lib/share";

const SHARE_TITLE = "Smrdíme?";
const SHARE_TEXT = "Kolik pražských tramvají právě jede bez klimatizace?";

export function ShareButton({ temperature }: { temperature: number | null }) {
  const [copied, setCopied] = useState(false);
  // Tie the button to the live temperature accent, like the headline numbers.
  const accent = temperature !== null ? getTemperatureHex(temperature) : NEUTRAL_HEX;

  async function handleShare() {
    // Fresh token per click so the shared link is a new URL the crawler hasn't
    // cached yet (see buildShareUrl).
    const url = buildShareUrl(Date.now());

    // Native share sheet on mobile; clipboard everywhere else.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
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
      className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 px-5 py-2.5 font-medium font-mono text-base transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
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
