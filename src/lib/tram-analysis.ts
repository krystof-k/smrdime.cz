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
  status: "loading" | "completed" | "error";
  error?: string;
}

export interface TramAnalysisResult {
  totalTrams: number;
  tramsWithoutAC: number;
  tramsWithAC: number;
  lastUpdated: Date;
  lineDetails: TramLineInfo[];
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
  lastUpdated: Date,
): TramAnalysisResult {
  const tramVehicles = vehicles.filter((vehicle) => vehicle.trip.gtfs.route_type === 0);

  const vehiclesByRoute = new Map<string, VehiclePosition[]>();
  for (const vehicle of tramVehicles) {
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
      status: "completed",
    };
  });

  const { withAC: tramsWithAC, withoutAC: tramsWithoutAC } = countByAC(tramVehicles);

  return {
    totalTrams: tramVehicles.length,
    tramsWithoutAC,
    tramsWithAC,
    lastUpdated,
    lineDetails,
  };
}

export async function analyzeTramACStatus(): Promise<TramAnalysisResult> {
  const [routes, vehicles] = await Promise.all([getTramRoutes(), getVehiclePositions()]);
  return analyze(routes, vehicles, new Date());
}
