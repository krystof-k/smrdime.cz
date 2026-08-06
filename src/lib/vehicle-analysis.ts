import { getRoutes, getVehiclePositions, type Route, type VehiclePosition } from "./golemio-api.ts";
import type { VehicleMode } from "./vehicle-modes.ts";

export interface LineInfo {
  lineNumber: string;
  routeId: string;
  /** Trolleybus lines live in the bus view but get their own 🚎 on the card. */
  isTrolleybus: boolean;
  totalVehicles: number;
  vehiclesWithAC: number;
  vehiclesWithoutAC: number;
}

export interface VehicleCounts {
  totalVehicles: number;
  vehiclesWithAC: number;
  vehiclesWithoutAC: number;
  lineDetails: LineInfo[];
}

export interface VehicleAnalysisResult {
  /** Vehicles physically mid-trip (live tracked position). */
  onTrack: VehicleCounts;
  /** Every vehicle in service, including those laying over at a terminus. */
  inService: VehicleCounts;
  lastUpdated: Date;
}

const TRAM_ROUTE_TYPE = 0;

// GTFS route type 11 = trolleybus. In the live feed (verified 2026-08-06)
// every type-11 line is a Prague DPP trolleybus (51, 52, 53, 58, 59) — city
// bus service in all but the wires — so the type alone qualifies, with no
// line-number gate.
const TROLLEYBUS_ROUTE_TYPE = 11;
const BUS_ROUTE_TYPE = 3;

/**
 * PID line-number ranges for Prague city bus service (route type 3):
 *   100–299  daytime city lines (incl. school lines)
 *   900–939  night city lines (suburban night starts at 941)
 * Everything else the feed carries as a bus — suburban 300+, tram-replacement
 * X-lines, specials like AE or other towns' "MHD n" lines — is not a
 * "pražský autobus".
 */
export function isCityBusLine(lineNumber: string): boolean {
  if (!/^\d+$/.test(lineNumber)) return false;
  const n = Number(lineNumber);
  return (n >= 100 && n <= 299) || (n >= 900 && n <= 939);
}

function matchesMode(mode: VehicleMode, routeType: number, lineNumber: string): boolean {
  if (mode === "tram") return routeType === TRAM_ROUTE_TYPE;
  if (routeType === TROLLEYBUS_ROUTE_TYPE) return true;
  return routeType === BUS_ROUTE_TYPE && isCityBusLine(lineNumber);
}

function countByAC(vehicles: VehiclePosition[]): {
  withAC: number;
  withoutAC: number;
} {
  let withAC = 0;
  let withoutAC = 0;
  for (const vehicle of vehicles) {
    // Golemio docs: null means "the information is not available", not "no
    // AC" — so unknowns land in neither bucket and the headline only counts
    // vehicles known to lack AC. They still count into the totals (they are
    // on the road). Live share of unknowns 2026-08-06: 0 % trams, ~0.3 %
    // city buses (a lone depot bus substituting on a trolleybus line).
    if (vehicle.trip.air_conditioned === true) withAC += 1;
    else if (vehicle.trip.air_conditioned === false) withoutAC += 1;
  }
  return { withAC, withoutAC };
}

function buildCounts(routes: Route[], vehicles: VehiclePosition[]): VehicleCounts {
  const vehiclesByRoute = new Map<string, VehiclePosition[]>();
  for (const vehicle of vehicles) {
    const routeId = vehicle.trip.gtfs.route_id;
    const existing = vehiclesByRoute.get(routeId);
    if (existing) existing.push(vehicle);
    else vehiclesByRoute.set(routeId, [vehicle]);
  }

  const lineDetails: LineInfo[] = routes.map((route) => {
    const lineVehicles = vehiclesByRoute.get(route.route_id) ?? [];
    const { withAC, withoutAC } = countByAC(lineVehicles);
    return {
      lineNumber: route.route_short_name,
      routeId: route.route_id,
      isTrolleybus: route.route_type === TROLLEYBUS_ROUTE_TYPE,
      totalVehicles: lineVehicles.length,
      vehiclesWithAC: withAC,
      vehiclesWithoutAC: withoutAC,
    };
  });

  const { withAC, withoutAC } = countByAC(vehicles);

  return {
    totalVehicles: vehicles.length,
    vehiclesWithAC: withAC,
    vehiclesWithoutAC: withoutAC,
    lineDetails,
  };
}

// The feed has one record per *trip*, not per vehicle: a vehicle mid-trip is a
// single tracked record, while one laying over at a terminus shows up as
// several untracked ones (the finished trip plus upcoming trips). Count each
// vehicle once — the live trip when tracked, else the next trip it will serve
// (that's the line a waiting vehicle is about to be), else the just-finished one.
function dedupeByVehicle(vehicles: VehiclePosition[], now: Date): VehiclePosition[] {
  const byVehicle = new Map<number | string, VehiclePosition[]>();
  for (const vehicle of vehicles) {
    // Registration is nullable upstream; falling back to the trip id keeps a
    // no-registration record as its own vehicle instead of collapsing all of
    // them into one map entry.
    const registration = vehicle.trip.vehicle_registration_number ?? vehicle.trip.gtfs.trip_id;
    const existing = byVehicle.get(registration);
    if (existing) existing.push(vehicle);
    else byVehicle.set(registration, [vehicle]);
  }

  return [...byVehicle.values()].map((records) => {
    const tracked = records.find((record) => record.last_position.tracking);
    if (tracked) return tracked;
    const byStart = [...records].sort(
      (a, b) => Date.parse(a.trip.start_timestamp) - Date.parse(b.trip.start_timestamp),
    );
    const upcoming = byStart.find(
      (record) => Date.parse(record.trip.start_timestamp) >= now.getTime(),
    );
    return upcoming ?? byStart[byStart.length - 1];
  });
}

export function analyze(
  routes: Route[],
  vehicles: VehiclePosition[],
  lastUpdated: Date,
  mode: VehicleMode,
): VehicleAnalysisResult {
  const modeRoutes = routes.filter((route) =>
    matchesMode(mode, route.route_type, route.route_short_name),
  );
  const modeVehicles = vehicles.filter((vehicle) =>
    matchesMode(mode, vehicle.trip.gtfs.route_type, vehicle.trip.gtfs.route_short_name),
  );
  const trackedVehicles = modeVehicles.filter((vehicle) => vehicle.last_position.tracking);

  // Prague trams and city buses (night lines included) run around the clock,
  // so a feed with zero tracked vehicles is an upstream vehicle-data outage
  // (Golemio still answers 200, possibly with residual untracked records), not
  // an empty city. Throw so consumers serve their error paths instead of
  // announcing "0 vehicles without AC" as fact.
  if (trackedVehicles.length === 0) {
    throw new Error("No tracked vehicles in the feed — upstream vehicle data outage");
  }

  return {
    onTrack: buildCounts(modeRoutes, trackedVehicles),
    inService: buildCounts(modeRoutes, dedupeByVehicle(modeVehicles, lastUpdated)),
    lastUpdated,
  };
}

export async function analyzeACStatus(mode: VehicleMode): Promise<VehicleAnalysisResult> {
  const [routes, vehicles] = await Promise.all([getRoutes(), getVehiclePositions()]);
  return analyze(routes, vehicles, new Date(), mode);
}
