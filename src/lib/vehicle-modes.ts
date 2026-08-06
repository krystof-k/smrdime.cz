export type VehicleMode = "tram" | "bus";

export type VehicleModeConfig = {
  /** Page showing this mode; trams own the homepage. */
  path: string;
  apiPath: string;
  emoji: string;
  /** Genitive plural — follows counts and "kolik": "80 tramvají", "kolik autobusů". */
  genitive: string;
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
    genitive: "tramvají",
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
    genitive: "autobusů",
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
