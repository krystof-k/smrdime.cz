const GOLEMIO_BASE_URL = "https://api.golemio.cz";

/**
 * Golemio returns up to `limit` records in one response. 10 000 is enough for
 * every tram in Prague many times over (current fleet is ~250 vehicles). If we
 * ever brush against this ceiling we'd need pagination; until then the single
 * call keeps things simple.
 */
const VEHICLE_POSITIONS_LIMIT = 10000;

const REQUEST_TIMEOUT_MS = 8000;

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string;
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

// Routes change rarely (a new tram line maybe once or twice a year). Cache them
// in the worker isolate for 30 min so each cold isolate hits Golemio once and
// then reuses the list for subsequent /api/tram calls.
const ROUTES_CACHE_TTL_MS = 30 * 60_000;

// When a refresh fails, keep serving the last successful list and retry after a
// short delay instead of hammering Golemio on every request. Route metadata is
// stable enough that month-stale data is still correct; we'd much rather ship
// that than blank the homepage on a transient catalog outage.
const ROUTES_STALE_RETRY_MS = 30_000;

/**
 * Builds a self-contained `getTramRoutes` with its own in-memory cache. The
 * default export below is the production instance; tests construct their own
 * instance to avoid cross-test state bleed.
 */
export function createTramRoutesLoader(
  ttlMs: number = ROUTES_CACHE_TTL_MS,
  staleRetryMs: number = ROUTES_STALE_RETRY_MS,
): () => Promise<Route[]> {
  let cached: { data: Route[]; expiresAt: number } | null = null;

  return async () => {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.data;

    try {
      const routes = await makeRequest<Route[]>("/v2/gtfs/routes");
      const trams = routes.filter((route) => route.route_type === 0);
      cached = { data: trams, expiresAt: now + ttlMs };
      return trams;
    } catch (err) {
      if (cached) {
        cached = { data: cached.data, expiresAt: now + staleRetryMs };
        return cached.data;
      }
      throw err;
    }
  };
}

export const getTramRoutes = createTramRoutesLoader();

export async function getVehiclePositions(routeId?: string): Promise<VehiclePosition[]> {
  const endpoint = routeId
    ? `/v2/vehiclepositions?routeId=${routeId}&limit=${VEHICLE_POSITIONS_LIMIT}`
    : `/v2/vehiclepositions?limit=${VEHICLE_POSITIONS_LIMIT}`;

  const response = await makeRequest<{
    features: Array<{ properties: VehiclePosition }>;
  }>(endpoint);
  return response.features.map((feature) => feature.properties);
}
