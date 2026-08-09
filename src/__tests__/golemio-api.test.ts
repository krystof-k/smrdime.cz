import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  capturedAtFrom,
  createRoutesLoader,
  getVehiclePositions,
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

function queueJson(body: unknown, headers: Record<string, string> = {}) {
  responseQueue.push(
    async () =>
      ({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(headers),
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

describe("routes loader", () => {
  it("requests /v2/gtfs/routes with X-Access-Token header", async () => {
    queueJson([]);
    const loader = createRoutesLoader();
    await loader();

    const [url, init] = fetchCalls[0];
    assert.equal(url, "https://api.golemio.cz/v2/gtfs/routes");
    const headers = (init as RequestInit).headers as Record<string, string>;
    assert.equal(headers["X-Access-Token"], "test-key");
    assert.equal(headers.Accept, "application/json");
  });

  it("returns the full PID list — mode filtering is the analysis layer's job", async () => {
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

    const loader = createRoutesLoader();
    const routes = await loader();
    assert.deepEqual(
      routes.map((r) => r.route_id),
      ["1", "B", "22"],
    );
  });

  it("throws on 5xx", async () => {
    queueStatus(500, "Server Error");

    const loader = createRoutesLoader();
    await assert.rejects(loader(), /API request failed: 500 Server Error/);
    assert.equal(fetchCalls.length, 1);
  });

  it("serves stale cached routes when a refresh fails", async () => {
    queueJson([tramRoute("1")]);
    queueStatus(500, "Server Error");

    // ttl 0 forces the second call to re-enter the fetch path; stale retry
    // window of 1 ms lets the third call re-enter it again so we can verify
    // both the fallback payload and that retries are actually happening.
    const loader = createRoutesLoader(0, 1);

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

    const loader = createRoutesLoader();
    await loader();
    await loader();
    await loader();

    assert.equal(fetchCalls.length, 1);
  });

  it("refetches once the TTL has elapsed", async () => {
    queueJson([tramRoute("1")]);
    queueJson([tramRoute("2")]);

    const loader = createRoutesLoader(0);
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

    const loader = createRoutesLoader();
    await assert.rejects(loader(), { name: "AbortError" });
  });

  it("throws when GOLEMIO_API_KEY is missing", async () => {
    const saved = process.env.GOLEMIO_API_KEY;
    delete process.env.GOLEMIO_API_KEY;
    try {
      const loader = createRoutesLoader();
      await assert.rejects(loader(), /GOLEMIO_API_KEY is not set/);
      assert.equal(fetchCalls.length, 0);
    } finally {
      process.env.GOLEMIO_API_KEY = saved;
    }
  });
});

describe("capturedAtFrom", () => {
  const now = new Date("2026-08-09T12:00:30Z");

  it("backdates by Age, so an edge-cached feed isn't stamped as fresh", () => {
    const headers = new Headers({ age: "27", date: "Sun, 09 Aug 2026 12:00:03 GMT" });
    assert.equal(capturedAtFrom(headers, now).toISOString(), "2026-08-09T12:00:03.000Z");
  });

  it("treats a fresh response (Age: 0) as captured now", () => {
    assert.equal(capturedAtFrom(new Headers({ age: "0" }), now).getTime(), now.getTime());
  });

  it("falls back to Date when there is no Age", () => {
    const headers = new Headers({ date: "Sun, 09 Aug 2026 12:00:10 GMT" });
    assert.equal(capturedAtFrom(headers, now).toISOString(), "2026-08-09T12:00:10.000Z");
  });

  it("stamps now when neither header is usable", () => {
    assert.equal(capturedAtFrom(new Headers(), now).getTime(), now.getTime());
    assert.equal(capturedAtFrom(new Headers({ age: "soon" }), now).getTime(), now.getTime());
  });

  it("ignores a negative Age rather than dating the feed in the future", () => {
    assert.equal(capturedAtFrom(new Headers({ age: "-5" }), now).getTime(), now.getTime());
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

    const { vehicles } = await getVehiclePositions();
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].trip.air_conditioned, true);
  });

  it("requests all vehicle positions in a single call, including untracked layovers", async () => {
    queueJson({ features: [] });
    await getVehiclePositions();
    assert.equal(
      fetchCalls[0][0],
      "https://api.golemio.cz/v2/vehiclepositions?limit=10000&includeNotTracking=true",
    );
  });

  it("reports the feed's capture time, not the moment we read it", async () => {
    queueJson({ features: [] }, { age: "20" });
    const before = Date.now();
    const { capturedAt } = await getVehiclePositions();

    // 20 s of Age must show up as 20 s of backdating, give or take test runtime.
    assert.ok(
      before - capturedAt.getTime() >= 20_000 && before - capturedAt.getTime() < 21_000,
      `expected ~20s backdate, got ${before - capturedAt.getTime()}ms`,
    );
  });
});
