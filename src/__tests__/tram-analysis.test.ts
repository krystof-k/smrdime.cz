import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Route, VehiclePosition } from "../lib/golemio-api.ts";
import { analyze } from "../lib/tram-analysis.ts";

function route(id: string, name = id): Route {
  return {
    route_id: id,
    route_short_name: name,
    route_long_name: name,
    route_type: 0,
    route_color: "#000",
  };
}

function vehicle(routeId: string, acStatus: boolean, tripId = `trip-${routeId}`): VehiclePosition {
  return {
    trip: {
      gtfs: {
        route_id: routeId,
        route_short_name: routeId,
        route_type: 0,
        trip_id: tripId,
      },
      air_conditioned: acStatus,
    },
  };
}

const FIXED_DATE = new Date("2026-04-19T12:00:00Z");

describe("analyze", () => {
  it("aggregates AC status across all tram routes", () => {
    const result = analyze(
      [route("1"), route("22")],
      [
        vehicle("1", true, "trip-1"),
        vehicle("1", false, "trip-2"),
        vehicle("22", true, "trip-3"),
        vehicle("22", false, "trip-4"),
      ],
      FIXED_DATE,
    );

    assert.equal(result.totalTrams, 4);
    assert.equal(result.tramsWithAC, 2);
    assert.equal(result.tramsWithoutAC, 2);
    assert.equal(result.lineDetails.length, 2);
    assert.equal(result.lastUpdated, FIXED_DATE);
  });

  it("filters out non-tram vehicles (route_type !== 0)", () => {
    const tram = vehicle("1", true);
    const bus: VehiclePosition = {
      trip: {
        gtfs: {
          route_id: "100",
          route_short_name: "100",
          route_type: 3,
          trip_id: "bus-1",
        },
        air_conditioned: true,
      },
    };

    const result = analyze([route("1")], [tram, bus], FIXED_DATE);
    assert.equal(result.totalTrams, 1);
  });

  it("returns zeros when no vehicles", () => {
    const result = analyze([route("1")], [], FIXED_DATE);
    assert.equal(result.totalTrams, 0);
    assert.equal(result.tramsWithoutAC, 0);
    assert.equal(result.lineDetails[0].totalVehicles, 0);
  });
});
