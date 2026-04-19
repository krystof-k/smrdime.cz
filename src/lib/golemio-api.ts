const GOLEMIO_BASE_URL = "https://api.golemio.cz";

/**
 * Golemio returns up to `limit` records in one response. 10 000 is enough for
 * every tram and bus in Prague many times over (fleet is ~250 trams + ~1 300
 * buses). If we ever brush against this ceiling we'd need pagination; until
 * then the single call keeps things simple.
 */
const VEHICLE_POSITIONS_LIMIT = 10000;

const REQUEST_TIMEOUT_MS = 8000;

// GTFS route_type values we care about.
export const ROUTE_TYPE_TRAM = 0;
export const ROUTE_TYPE_BUS = 3;
export type SupportedRouteType = typeof ROUTE_TYPE_TRAM | typeof ROUTE_TYPE_BUS;

/**
 * Prague's PID GTFS is multi-operator: DPP (urban metro/tram/bus) shares the
 * feed with regional carriers like Arriva and ČSAD. We filter to DPP-only via
 * the PID-assigned agency_id "99" (confirmed in the Golemio OpenAPI schema
 * example for metro line A, route_id "L991"). Keeping this central so the
 * tram loader benefits from the same check even though all Prague trams are
 * DPP today.
 */
export const DPP_AGENCY_ID = "99";

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string;
  agency_id: string;
  is_regional: boolean;
}

export interface VehiclePosition {
  trip: {
    gtfs: {
      route_id: string;
      route_short_name: string;
      route_type: number;
      trip_id: string;
    };
    air_conditioned: boolean;
  };
}

async function makeRequest<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.GOLEMIO_API_KEY;
  if (!apiKey) {
    throw new Error("GOLEMIO_API_KEY is not set in environment variables");
  }

  const response = await fetch(`${GOLEMIO_BASE_URL}${endpoint}`, {
    headers: {
      "X-Access-Token": apiKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

// Routes change rarely (a new tram or bus line maybe a couple times a year).
// Cache them in the worker isolate for 30 min so each cold isolate hits
// Golemio once per route_type and then reuses the list for subsequent calls.
const ROUTES_CACHE_TTL_MS = 30 * 60_000;

/**
 * Builds a self-contained routes loader for a single GTFS route_type with its
 * own in-memory cache. The module-level exports below are the production
 * instances; tests construct their own to avoid cross-test state bleed.
 */
export function createRoutesLoader(
  routeType: SupportedRouteType,
  ttlMs: number = ROUTES_CACHE_TTL_MS,
): () => Promise<Route[]> {
  let cached: { data: Route[]; expiresAt: number } | null = null;

  return async () => {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.data;

    const routes = await makeRequest<Route[]>("/v2/gtfs/routes");
    const filtered = routes.filter(
      (route) => route.route_type === routeType && route.agency_id === DPP_AGENCY_ID,
    );
    cached = { data: filtered, expiresAt: now + ttlMs };
    return filtered;
  };
}

export const getTramRoutes = createRoutesLoader(ROUTE_TYPE_TRAM);
export const getBusRoutes = createRoutesLoader(ROUTE_TYPE_BUS);

export async function getVehiclePositions(routeId?: string): Promise<VehiclePosition[]> {
  const endpoint = routeId
    ? `/v2/vehiclepositions?routeId=${routeId}&limit=${VEHICLE_POSITIONS_LIMIT}`
    : `/v2/vehiclepositions?limit=${VEHICLE_POSITIONS_LIMIT}`;

  const response = await makeRequest<{
    features: Array<{ properties: VehiclePosition }>;
  }>(endpoint);
  return response.features.map((feature) => feature.properties);
}
