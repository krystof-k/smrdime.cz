import {
  BUS_AC_PERCENTAGE,
  BUS_FLEET_TOTAL,
  DPP_AC_FAQ_URL,
  DPP_BUS_STATS_URL,
} from "@/lib/constants";
import { INFO_POPOVER_LINK_CLASS, InfoPopover } from "./InfoPopover";

export function BusDppInfoPopover() {
  return (
    <InfoPopover triggerLabel="dpp.cz">
      Podle{" "}
      <a
        href={DPP_AC_FAQ_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={INFO_POPOVER_LINK_CLASS}
      >
        DPP
      </a>{" "}
      má k 31. květnu 2025 klimatizaci{" "}
      <span className="font-mono">{BUS_AC_PERCENTAGE.toString().replace(".", ",")}</span>{" "}
      <span className="font-mono">%</span> z{" "}
      <a
        href={DPP_BUS_STATS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={INFO_POPOVER_LINK_CLASS}
      >
        <span className="font-mono">{BUS_FLEET_TOTAL.toLocaleString("cs-CZ")}</span> autobusů ve
        flotile
      </a>
      .
    </InfoPopover>
  );
}
