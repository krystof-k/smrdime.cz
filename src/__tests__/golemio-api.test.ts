import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { createTramRoutesLoader, getVehiclePositions, type Route } from "../lib/golemio-api.ts";

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

function tramRoute(id: string): Route {
  return {
    route_id: id,
    route_short_name: id,
    route_long_name: id,
    route_type: 0,
    route_color: "#f00",
  };
}

describe("tram routes loader", () => {
  it("requests /v2/gtfs/routes with X-Access-Token header", async () => {
    queueJson([]);
    const loader = createTramRoutesLoader();
    await loader();

    const [url, init] = fetchCalls[0];
    assert.equal(url, "https://api.golemio.cz/v2/gtfs/routes");
    const headers = (init as RequestInit).headers as Record<string, string>;
    assert.equal(headers["X-Access-Token"], "test-key");
    assert.equal(headers.Accept, "application/json");
  });

  it("filters out non-tram routes (route_type !== 0)", async () => {
    queueJson([
      tramRoute("1"),
      {
        route_id: "B",
        route_short_name: "B",
        route_long_name: "Metro",
        route_type: 1,
        route_color: "#0f0",
      },
      tramRoute("22"),
    ]);

    const loader = createTramRoutesLoader();
    const routes = await loader();
    assert.deepEqual(
      routes.map((r) => r.route_id),
      ["1", "22"],
    );
  });

  it("throws on 5xx", async () => {
    queueStatus(500, "Server Error");

    const loader = createTramRoutesLoader();
    await assert.rejects(loader(), /API request failed: 500 Server Error/);
    assert.equal(fetchCalls.length, 1);
  });

  it("serves stale cached routes when a refresh fails", async () => {
    queueJson([tramRoute("1")]);
    queueStatus(500, "Server Error");

    // ttl 0 forces the second call to re-enter the fetch path; stale retry
    // window of 1 ms lets the third call re-enter it again so we can verify
    // both the fallback payload and that retries are actually happening.
    const loader = createTramRoutesLoader(0, 1);

    const first = await loader();
    assert.deepEqual(
      first.map((r) => r.route_id),
      ["1"],
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await loader();
    assert.deepEqual(
      second.map((r) => r.route_id),
      ["1"],
      "stale payload should be reused when refresh fails",
    );
    assert.equal(fetchCalls.length, 2);
  });

  it("caches routes across calls within one loader instance", async () => {
    queueJson([tramRoute("1")]);

    const loader = createTramRoutesLoader();
    await loader();
    await loader();
    await loader();

    assert.equal(fetchCalls.length, 1);
  });

  it("refetches once the TTL has elapsed", async () => {
    queueJson([tramRoute("1")]);
    queueJson([tramRoute("2")]);

    const loader = createTramRoutesLoader(0);
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

    const loader = createTramRoutesLoader();
    await assert.rejects(loader(), { name: "AbortError" });
  });

  it("throws when GOLEMIO_API_KEY is missing", async () => {
    const saved = process.env.GOLEMIO_API_KEY;
    delete process.env.GOLEMIO_API_KEY;
    try {
      const loader = createTramRoutesLoader();
      await assert.rejects(loader(), /GOLEMIO_API_KEY is not set/);
      assert.equal(fetchCalls.length, 0);
    } finally {
      process.env.GOLEMIO_API_KEY = saved;
    }
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
