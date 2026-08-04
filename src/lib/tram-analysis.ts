import {
  getTramRoutes,
  getVehiclePositions,
  type Route,
  type VehiclePosition,
} from "./golemio-api.ts";

export interface TramLineInfo {
  lineNumber: string;
  routeId: string;
  totalVehicles: number;
  vehiclesWithAC: number;
  vehiclesWithoutAC: number;
}

export interface TramCounts {
  totalTrams: number;
  tramsWithoutAC: number;
  tramsWithAC: number;
  lineDetails: TramLineInfo[];
}

export interface TramAnalysisResult {
  /** Trams physically mid-trip (live tracked position). */
  onTrack: TramCounts;
  /** Every tram in service, including those laying over at a terminus. */
  inService: TramCounts;
  lastUpdated: Date;
}

function countByAC(vehicles: VehiclePosition[]): {
  withAC: number;
  withoutAC: number;
} {
  let withAC = 0;
  let withoutAC = 0;
  for (const vehicle of vehicles) {
    if (vehicle.trip.air_conditioned) withAC += 1;
    else withoutAC += 1;
  }
  return { withAC, withoutAC };
}

function buildCounts(routes: Route[], vehicles: VehiclePosition[]): TramCounts {
  const vehiclesByRoute = new Map<string, VehiclePosition[]>();
  for (const vehicle of vehicles) {
    const routeId = vehicle.trip.gtfs.route_id;
    const existing = vehiclesByRoute.get(routeId);
    if (existing) existing.push(vehicle);
    else vehiclesByRoute.set(routeId, [vehicle]);
  }

  const lineDetails: TramLineInfo[] = routes.map((route) => {
    const lineVehicles = vehiclesByRoute.get(route.route_id) ?? [];
    const { withAC, withoutAC } = countByAC(lineVehicles);
    return {
      lineNumber: route.route_short_name,
      routeId: route.route_id,
      totalVehicles: lineVehicles.length,
      vehiclesWithAC: withAC,
      vehiclesWithoutAC: withoutAC,
    };
  });

  const { withAC: tramsWithAC, withoutAC: tramsWithoutAC } = countByAC(vehicles);

  return {
    totalTrams: vehicles.length,
    tramsWithoutAC,
    tramsWithAC,
    lineDetails,
  };
}

// The feed has one record per *trip*, not per vehicle: a tram mid-trip is a
// single tracked record, while a tram laying over at a terminus shows up as
// several untracked ones (the finished trip plus upcoming trips). Count each
// vehicle once — the live trip when tracked, else the next trip it will serve
// (that's the line a waiting tram is about to be), else the just-finished one.
function dedupeByVehicle(vehicles: VehiclePosition[], now: Date): VehiclePosition[] {
  const byVehicle = new Map<number, VehiclePosition[]>();
  for (const vehicle of vehicles) {
    const registration = vehicle.trip.vehicle_registration_number;
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
): TramAnalysisResult {
  const tramVehicles = vehicles.filter((vehicle) => vehicle.trip.gtfs.route_type === 0);
  const trackedVehicles = tramVehicles.filter((vehicle) => vehicle.last_position.tracking);

  return {
    onTrack: buildCounts(routes, trackedVehicles),
    inService: buildCounts(routes, dedupeByVehicle(tramVehicles, lastUpdated)),
    lastUpdated,
  };
}

export async function analyzeTramACStatus(): Promise<TramAnalysisResult> {
  const [routes, vehicles] = await Promise.all([getTramRoutes(), getVehiclePositions()]);
  return analyze(routes, vehicles, new Date());
}
