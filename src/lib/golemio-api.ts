const GOLEMIO_BASE_URL = "https://api.golemio.cz";

/**
 * Golemio returns up to `limit` records in one response. 10 000 comfortably
 * covers every PID vehicle on the road at once (a few thousand trip records,
 * layover duplicates included). If we ever brush against this ceiling we'd
 * need pagination; until then the single call keeps things simple.
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
    /**
     * Golemio docs: "Determines whether the vehicle has air conditioning.
     * If null, the information is not available or the vehicle's
     * registration number is not known."
     */
    air_conditioned: boolean | null;
    /** Nullable upstream — rare operators don't report fleet numbers. */
    vehicle_registration_number: number | null;
    start_timestamp: string;
  };
  last_position: {
    tracking: boolean;
    /**
     * Golemio enum; the untracked states served by the API are
     * "before_track", "before_track_delayed" and "canceled" — a
     * before_track* trip has not departed yet, even if its scheduled
     * start is already in the past.
     */
    state_position?: string;
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

// Routes change rarely (a new line maybe a few times a year). Cache the full
// PID list in the worker isolate for 30 min so each cold isolate hits Golemio
// once and then reuses it for subsequent /api/tram and /api/bus calls.
const ROUTES_CACHE_TTL_MS = 30 * 60_000;

// When a refresh fails, keep serving the last successful list and retry after a
// short delay instead of hammering Golemio on every request. Route metadata is
// stable enough that month-stale data is still correct; we'd much rather ship
// that than blank the homepage on a transient catalog outage.
const ROUTES_STALE_RETRY_MS = 30_000;

/**
 * Builds a self-contained `getRoutes` with its own in-memory cache. The
 * default export below is the production instance; tests construct their own
 * instance to avoid cross-test state bleed. Mode filtering (trams vs buses)
 * happens in the analysis layer so both share this one cache.
 */
export function createRoutesLoader(
  ttlMs: number = ROUTES_CACHE_TTL_MS,
  staleRetryMs: number = ROUTES_STALE_RETRY_MS,
): () => Promise<Route[]> {
  let cached: { data: Route[]; expiresAt: number } | null = null;

  return async () => {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.data;

    try {
      const routes = await makeRequest<Route[]>("/v2/gtfs/routes");
      cached = { data: routes, expiresAt: now + ttlMs };
      return routes;
    } catch (err) {
      if (cached) {
        cached = { data: cached.data, expiresAt: now + staleRetryMs };
        return cached.data;
      }
      throw err;
    }
  };
}

export const getRoutes = createRoutesLoader();

export async function getVehiclePositions(): Promise<VehiclePosition[]> {
  // includeNotTracking adds the untracked trip records (before/after a run)
  // that a tram on a terminus layover shows up as — without them a tram
  // vanishes from the feed the moment it reaches the end stop and reappears
  // on departure. Non-public trips (depot transfers, deadheads) stay excluded;
  // we deliberately don't pass includeNotPublic.
  const response = await makeRequest<{
    features: Array<{ properties: VehiclePosition }>;
  }>(`/v2/vehiclepositions?limit=${VEHICLE_POSITIONS_LIMIT}&includeNotTracking=true`);
  // Hitting the limit means silent truncation upstream — the counts would
  // quietly deflate. Live feed runs ~3-4k records, so this firing at all is
  // the signal to add pagination.
  if (response.features.length === VEHICLE_POSITIONS_LIMIT) {
    console.warn("vehiclepositions hit the response limit — vehicle counts may be truncated");
  }
  return response.features.map((feature) => feature.properties);
}
