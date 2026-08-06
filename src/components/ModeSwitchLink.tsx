import Link from "next/link";
import { otherMode, VEHICLE_MODES, type VehicleMode } from "@/lib/vehicle-modes";
import { ACTION_BUTTON_CLASS } from "./ShareButton";

// PID livery colors — buses run in blue, trams in red — so the link wears the
// color of the vehicle it takes you to, and never mimics the share button's
// temperature accent.
const TARGET_COLOR: Record<VehicleMode, string> = {
  tram: "border-red-600 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/40",
  bus: "border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/40",
};

/** "A co autobusy? 🚌" — Honza's question, verbatim, as the way to answer it. */
export function ModeSwitchLink({ mode }: { mode: VehicleMode }) {
  const targetMode = otherMode(mode);
  const target = VEHICLE_MODES[targetMode];

  return (
    <Link href={target.path} className={`${ACTION_BUTTON_CLASS} ${TARGET_COLOR[targetMode]}`}>
      A co {target.plural}? {target.emoji}
    </Link>
  );
}
