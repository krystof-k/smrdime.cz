import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyze,
  ROUTE_TYPE_BUS,
  ROUTE_TYPE_TRAM,
  type VehicleAnalysisResult,
} from "../lib/analysis.ts";
import type { Route, VehiclePosition } from "../lib/golemio-api.ts";

function route(id: string, routeType: number, name = id): Route {
  return {
    route_id: id,
    route_short_name: name,
    route_long_name: name,
    route_type: routeType,
    route_color: "#000",
  };
}

function vehicle(
  routeId: string,
  routeType: number,
  acStatus: boolean,
  tripId = `trip-${routeId}`,
): VehiclePosition {
  return {
    trip: {
      gtfs: {
        route_id: routeId,
        route_short_name: routeId,
        route_type: routeType,
        trip_id: tripId,
      },
      air_conditioned: acStatus,
    },
  };
}

const FIXED_DATE = new Date("2026-04-19T12:00:00Z");

describe("analyze", () => {
  it("aggregates tram AC status across routes", () => {
    const result: VehicleAnalysisResult = analyze(
      [route("1", ROUTE_TYPE_TRAM), route("22", ROUTE_TYPE_TRAM)],
      [
        vehicle("1", ROUTE_TYPE_TRAM, true, "trip-1"),
        vehicle("1", ROUTE_TYPE_TRAM, false, "trip-2"),
        vehicle("22", ROUTE_TYPE_TRAM, true, "trip-3"),
        vehicle("22", ROUTE_TYPE_TRAM, false, "trip-4"),
      ],
      ROUTE_TYPE_TRAM,
      FIXED_DATE,
    );

    assert.equal(result.totalVehicles, 4);
    assert.equal(result.vehiclesWithAC, 2);
    assert.equal(result.vehiclesWithoutAC, 2);
    assert.equal(result.lineDetails.length, 2);
    assert.equal(result.lastUpdated, FIXED_DATE);
  });

  it("aggregates bus AC status independently when routeType=3", () => {
    const result = analyze(
      [route("100", ROUTE_TYPE_BUS), route("200", ROUTE_TYPE_BUS)],
      [
        vehicle("100", ROUTE_TYPE_BUS, true, "bus-1"),
        vehicle("100", ROUTE_TYPE_BUS, true, "bus-2"),
        vehicle("200", ROUTE_TYPE_BUS, false, "bus-3"),
      ],
      ROUTE_TYPE_BUS,
      FIXED_DATE,
    );

    assert.equal(result.totalVehicles, 3);
    assert.equal(result.vehiclesWithAC, 2);
    assert.equal(result.vehiclesWithoutAC, 1);
  });

  it("filters out vehicles whose route_type does not match the requested type", () => {
    const tram = vehicle("1", ROUTE_TYPE_TRAM, true);
    const bus = vehicle("100", ROUTE_TYPE_BUS, true);

    const tramResult = analyze(
      [route("1", ROUTE_TYPE_TRAM)],
      [tram, bus],
      ROUTE_TYPE_TRAM,
      FIXED_DATE,
    );
    assert.equal(tramResult.totalVehicles, 1);

    const busResult = analyze(
      [route("100", ROUTE_TYPE_BUS)],
      [tram, bus],
      ROUTE_TYPE_BUS,
      FIXED_DATE,
    );
    assert.equal(busResult.totalVehicles, 1);
  });

  it("returns zeros when no vehicles", () => {
    const result = analyze([route("1", ROUTE_TYPE_TRAM)], [], ROUTE_TYPE_TRAM, FIXED_DATE);
    assert.equal(result.totalVehicles, 0);
    assert.equal(result.vehiclesWithoutAC, 0);
    assert.equal(result.lineDetails[0].totalVehicles, 0);
  });
});
