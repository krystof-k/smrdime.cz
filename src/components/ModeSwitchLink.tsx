"use client";

import Link from "next/link";
import { getTemperatureHex, NEUTRAL_HEX } from "@/lib/display";
import { otherMode, VEHICLE_MODES, type VehicleMode } from "@/lib/vehicle-modes";
import { ACTION_BUTTON_CLASS } from "./ShareButton";

/** "A co autobusy? 🚌" — Honza's question, verbatim, as the way to answer it. */
export function ModeSwitchLink({
  mode,
  temperature,
}: {
  mode: VehicleMode;
  temperature: number | null;
}) {
  const target = VEHICLE_MODES[otherMode(mode)];
  const accent = temperature !== null ? getTemperatureHex(temperature) : NEUTRAL_HEX;

  return (
    <Link
      href={target.path}
      style={{ color: accent, borderColor: accent }}
      className={ACTION_BUTTON_CLASS}
    >
      A co {target.plural}? {target.emoji}
    </Link>
  );
}
