export type VehicleMode = "tram" | "bus";

export type VehicleModeConfig = {
  /** Page showing this mode; trams own the homepage. */
  path: string;
  apiPath: string;
  emoji: string;
  /**
   * Czech noun forms picked by count: "1 tramvaj, 3 tramvaje, 80 tramvají".
   * `many` doubles as the genitive used after percentages and "kolik".
   */
  nounForms: { one: string; few: string; many: string };
  /** Nominative/accusative plural — "Zahrnout i tramvaje…", "A co autobusy?". */
  plural: string;
  /** Where a vehicle mid-trip is said to be: trams run "na trati", buses "na lince". */
  onRouteLabel: string;
  /** Where the vehicles gossip when the API is down: "v depu" / "v garáži". */
  restingPlace: string;
  title: string;
  description: string;
  shareText: string;
};

export const VEHICLE_MODES: Record<VehicleMode, VehicleModeConfig> = {
  tram: {
    path: "/",
    apiPath: "/api/tram",
    emoji: "🚋",
    nounForms: { one: "tramvaj", few: "tramvaje", many: "tramvají" },
    plural: "tramvaje",
    onRouteLabel: "na trati",
    restingPlace: "v depu",
    title: "Smrdíme? Kolik pražských tramvají jede bez klimatizace",
    description: "Živý přehled, kolik pražských tramvají zrovna jezdí bez klimatizace.",
    shareText: "Kolik pražských tramvají právě jede bez klimatizace?",
  },
  bus: {
    path: "/autobusy",
    apiPath: "/api/bus",
    emoji: "🚌",
    nounForms: { one: "autobus", few: "autobusy", many: "autobusů" },
    plural: "autobusy",
    onRouteLabel: "na lince",
    restingPlace: "v garáži",
    title: "Smrdíme? Kolik pražských autobusů jede bez klimatizace",
    description: "Živý přehled, kolik pražských autobusů zrovna jezdí bez klimatizace.",
    shareText: "Kolik pražských autobusů právě jede bez klimatizace?",
  },
};

export function otherMode(mode: VehicleMode): VehicleMode {
  return mode === "tram" ? "bus" : "tram";
}

const PLURAL_RULES = new Intl.PluralRules("cs");

/**
 * Czech noun for a vehicle count: "jezdí 1 tramvaj / 3 tramvaje / 80 tramvají".
 * A fixed genitive would misdecline small counts, which quiet nights reach.
 */
export function vehicleNoun(mode: VehicleMode, count: number): string {
  const { nounForms } = VEHICLE_MODES[mode];
  const rule = PLURAL_RULES.select(count);
  if (rule === "one") return nounForms.one;
  if (rule === "few") return nounForms.few;
  return nounForms.many;
}
