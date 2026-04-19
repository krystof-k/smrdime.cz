import { AC_FLEET_15T, AC_FLEET_52T, DPP_52T_URL, DPP_AC_FAQ_URL } from "@/lib/constants";
import { INFO_POPOVER_LINK_CLASS, InfoPopover } from "./InfoPopover";

export function DppInfoPopover() {
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
      jezdí v Praze <span className="font-mono">{AC_FLEET_15T}</span> klimatizovaných tramvají{" "}
      <span className="whitespace-nowrap">Škoda 15T</span> (druhá dodávka) a všech{" "}
      <span className="font-mono">{AC_FLEET_52T}</span> dosud dodaných tramvají{" "}
      <a
        href={DPP_52T_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={INFO_POPOVER_LINK_CLASS}
      >
        Škoda 52T
      </a>
      .
    </InfoPopover>
  );
}
