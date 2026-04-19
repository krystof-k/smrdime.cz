import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  createRoutesLoader,
  getVehiclePositions,
  ROUTE_TYPE_BUS,
  ROUTE_TYPE_TRAM,
  type Route,
} from "../lib/golemio-api.ts";

const originalFetch = globalThis.fetch;
const fetchCalls: Array<[string, RequestInit | undefined]> = [];
const responseQueue: Array<(init?: RequestInit) => Promise<Response>> = [];

const fakeFetch: typeof fetch = async (input, init) => {
  fetchCalls.push([
    typeof input === "string" ? input : input.toString(),
    init as RequestInit | undefined,
  ]);
  const next = responseQueue.shift();
  if (!next) throw new Error("fetch called without a queued response");
  return next(init as RequestInit | undefined);
};

before(() => {
  globalThis.fetch = fakeFetch;
  process.env.GOLEMIO_API_KEY = "test-key";
});

after(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  fetchCalls.length = 0;
  responseQueue.length = 0;
});

function queueJson(body: unknown) {
  responseQueue.push(
    async () =>
      ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => body,
      }) as Response,
  );
}

function queueStatus(status: number, statusText: string) {
  responseQueue.push(
    async () =>
      ({
        ok: false,
        status,
        statusText,
        json: async () => ({}),
      }) as Response,
  );
}

function routeOfType(
  id: string,
  routeType: number,
  { agency_id = "99", is_regional = false }: { agency_id?: string; is_regional?: boolean } = {},
): Route {
  return {
    route_id: id,
    route_short_name: id,
    route_long_name: id,
    route_type: routeType,
    route_color: "#f00",
    agency_id,
    is_regional,
  };
}

describe("tram routes loader", () => {
  it("requests /v2/gtfs/routes with X-Access-Token header", async () => {
    queueJson([]);
    const loader = createRoutesLoader(ROUTE_TYPE_TRAM);
    await loader();

    const [url, init] = fetchCalls[0];
    assert.equal(url, "https://api.golemio.cz/v2/gtfs/routes");
    const headers = (init as RequestInit).headers as Record<string, string>;
    assert.equal(headers["X-Access-Token"], "test-key");
    assert.equal(headers.Accept, "application/json");
  });

  it("filters out non-tram routes (route_type !== 0) and applies the same DPP filter", async () => {
    queueJson([
      routeOfType("1", ROUTE_TYPE_TRAM),
      routeOfType("B", 1),
      routeOfType("100", ROUTE_TYPE_BUS),
      routeOfType("22", ROUTE_TYPE_TRAM),
      // Symmetric edge case: if PID ever exposes a substitute tram with an
      // X-prefix short name, it's a real DPP service and must be kept.
      { ...routeOfType("X22", ROUTE_TYPE_TRAM), route_short_name: "X22" },
    ]);

    const loader = createRoutesLoader(ROUTE_TYPE_TRAM);
    const routes = await loader();
    assert.deepEqual(
      routes.map((r) => r.route_id),
      ["1", "22", "X22"],
    );
  });

  it("throws on 5xx", async () => {
    queueStatus(500, "Server Error");

    const loader = createRoutesLoader(ROUTE_TYPE_TRAM);
    await assert.rejects(loader(), /API request failed: 500 Server Error/);
    assert.equal(fetchCalls.length, 1);
  });

  it("caches routes across calls within one loader instance", async () => {
    queueJson([routeOfType("1", ROUTE_TYPE_TRAM)]);

    const loader = createRoutesLoader(ROUTE_TYPE_TRAM);
    await loader();
    await loader();
    await loader();

    assert.equal(fetchCalls.length, 1);
  });

  it("refetches once the TTL has elapsed", async () => {
    queueJson([routeOfType("1", ROUTE_TYPE_TRAM)]);
    queueJson([routeOfType("2", ROUTE_TYPE_TRAM)]);

    const loader = createRoutesLoader(ROUTE_TYPE_TRAM, 0);
    await loader();
    await loader();

    assert.equal(fetchCalls.length, 2);
  });

  it("aborts the request when it exceeds the timeout", async () => {
    // The fetch never resolves on its own — it only rejects when the
    // AbortSignal.timeout wired into makeRequest fires, proving the timeout
    // cancellation path actually runs.
    responseQueue.push(
      (init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("expected an abort signal on the fetch init"));
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const loader = createRoutesLoader(ROUTE_TYPE_TRAM);
    await assert.rejects(loader(), { name: "AbortError" });
  });

  it("throws when GOLEMIO_API_KEY is missing", async () => {
    const saved = process.env.GOLEMIO_API_KEY;
    delete process.env.GOLEMIO_API_KEY;
    try {
      const loader = createRoutesLoader(ROUTE_TYPE_TRAM);
      await assert.rejects(loader(), /GOLEMIO_API_KEY is not set/);
      assert.equal(fetchCalls.length, 0);
    } finally {
      process.env.GOLEMIO_API_KEY = saved;
    }
  });
});

describe("bus routes loader", () => {
  it("filters out non-bus routes (route_type !== 3)", async () => {
    queueJson([
      routeOfType("1", ROUTE_TYPE_TRAM),
      routeOfType("100", ROUTE_TYPE_BUS),
      routeOfType("B", 1),
      routeOfType("200", ROUTE_TYPE_BUS),
    ]);

    const loader = createRoutesLoader(ROUTE_TYPE_BUS);
    const routes = await loader();
    assert.deepEqual(
      routes.map((r) => r.route_id),
      ["100", "200"],
    );
  });

  it("narrows PID's multi-operator feed to DPP's regular Prague bus fleet", async () => {
    // One fixture covers every category we researched against pid.cz docs.
    // Comments record why each row is in or out so future readers can verify.
    queueJson([
      // Kept: regular DPP day / school / night bus lines
      routeOfType("100", ROUTE_TYPE_BUS),
      routeOfType("136", ROUTE_TYPE_BUS),
      routeOfType("907", ROUTE_TYPE_BUS),
      // Kept: tram-substitute bus drawn from DPP regular fleet
      { ...routeOfType("X25", ROUTE_TYPE_BUS), route_short_name: "X25" },
      // Dropped (non-numeric short name): DPP shuttles outside regular fleet
      { ...routeOfType("IKEA", ROUTE_TYPE_BUS), route_short_name: "IKEA" },
      { ...routeOfType("AE", ROUTE_TYPE_BUS), route_short_name: "AE" },
      { ...routeOfType("BB1", ROUTE_TYPE_BUS), route_short_name: "BB1" },
      // Dropped (non-numeric short name): other towns' urban transit
      { ...routeOfType("MHD3", ROUTE_TYPE_BUS), route_short_name: "MHD 3" },
      { ...routeOfType("MHD7", ROUTE_TYPE_BUS), route_short_name: "MHD 7" },
      // Dropped (is_regional=true): suburban / regional carriers
      routeOfType("381", ROUTE_TYPE_BUS, { is_regional: true }),
      routeOfType("501", ROUTE_TYPE_BUS, { is_regional: true }), // MHD Příbram
    ]);

    const loader = createRoutesLoader(ROUTE_TYPE_BUS);
    const routes = await loader();
    assert.deepEqual(
      routes.map((r) => r.route_short_name),
      ["100", "136", "907", "X25"],
    );
  });

  it("keeps its own cache separate from the tram loader", async () => {
    queueJson([routeOfType("1", ROUTE_TYPE_TRAM)]);
    queueJson([routeOfType("100", ROUTE_TYPE_BUS)]);

    const tramLoader = createRoutesLoader(ROUTE_TYPE_TRAM);
    const busLoader = createRoutesLoader(ROUTE_TYPE_BUS);
    const trams = await tramLoader();
    const buses = await busLoader();

    assert.equal(fetchCalls.length, 2);
    assert.equal(trams[0].route_id, "1");
    assert.equal(buses[0].route_id, "100");
  });
});

describe("getVehiclePositions", () => {
  it("unwraps features[].properties from the GeoJSON response", async () => {
    queueJson({
      features: [
        {
          properties: {
            trip: {
              gtfs: {
                route_id: "9",
                route_short_name: "9",
                route_type: 0,
                trip_id: "t1",
              },
              air_conditioned: true,
            },
          },
        },
      ],
    });

    const result = await getVehiclePositions();
    assert.equal(result.length, 1);
    assert.equal(result[0].trip.air_conditioned, true);
  });

  it("adds routeId filter when provided", async () => {
    queueJson({ features: [] });
    await getVehiclePositions("22");
    assert.equal(
      fetchCalls[0][0],
      "https://api.golemio.cz/v2/vehiclepositions?routeId=22&limit=10000",
    );
  });

  it("omits routeId when not provided", async () => {
    queueJson({ features: [] });
    await getVehiclePositions();
    assert.equal(fetchCalls[0][0], "https://api.golemio.cz/v2/vehiclepositions?limit=10000");
  });
});
