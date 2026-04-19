import {
  getBusRoutes,
  getTramRoutes,
  getVehiclePositions,
  ROUTE_TYPE_BUS,
  ROUTE_TYPE_TRAM,
  type Route,
  type SupportedRouteType,
  type VehiclePosition,
} from "./golemio-api.ts";

export interface LineInfo {
  lineNumber: string;
  routeId: string;
  totalVehicles: number;
  vehiclesWithAC: number;
  vehiclesWithoutAC: number;
  status: "loading" | "completed" | "error";
  error?: string;
}

export interface VehicleAnalysisResult {
  totalVehicles: number;
  vehiclesWithoutAC: number;
  vehiclesWithAC: number;
  lastUpdated: Date;
  lineDetails: LineInfo[];
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

export function analyze(
  routes: Route[],
  vehicles: VehiclePosition[],
  routeType: SupportedRouteType,
  lastUpdated: Date,
): VehicleAnalysisResult {
  // Cross-filter by route_id membership: `/vehiclepositions` returns every
  // PID vehicle regardless of operator, so we drop anything whose route isn't
  // in the already-DPP-filtered routes list. Without this, buses from Arriva
  // / ČSAD would inflate the counts.
  const routeIds = new Set(routes.map((route) => route.route_id));
  const matching = vehicles.filter(
    (vehicle) =>
      vehicle.trip.gtfs.route_type === routeType && routeIds.has(vehicle.trip.gtfs.route_id),
  );

  const vehiclesByRoute = new Map<string, VehiclePosition[]>();
  for (const vehicle of matching) {
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
      totalVehicles: lineVehicles.length,
      vehiclesWithAC: withAC,
      vehiclesWithoutAC: withoutAC,
      status: "completed",
    };
  });

  const { withAC, withoutAC } = countByAC(matching);

  return {
    totalVehicles: matching.length,
    vehiclesWithoutAC: withoutAC,
    vehiclesWithAC: withAC,
    lastUpdated,
    lineDetails,
  };
}

export async function analyzeACStatus(
  routeType: SupportedRouteType,
): Promise<VehicleAnalysisResult> {
  const getRoutes = routeType === ROUTE_TYPE_TRAM ? getTramRoutes : getBusRoutes;
  const [routes, vehicles] = await Promise.all([getRoutes(), getVehiclePositions()]);
  return analyze(routes, vehicles, routeType, new Date());
}

export { ROUTE_TYPE_BUS, ROUTE_TYPE_TRAM };
