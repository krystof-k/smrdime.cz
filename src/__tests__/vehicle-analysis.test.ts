import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Route, VehiclePosition } from "../lib/golemio-api.ts";
import { analyze, isCityBusLine } from "../lib/vehicle-analysis.ts";

function route(id: string, name = id, routeType = 0): Route {
  return {
    route_id: id,
    route_short_name: name,
    route_long_name: name,
    route_type: routeType,
    route_color: "#000",
  };
}

let tripCounter = 0;

function vehicle(
  routeId: string,
  acStatus: boolean,
  opts: { reg?: number; tracking?: boolean; start?: string; routeType?: number } = {},
): VehiclePosition {
  tripCounter += 1;
  return {
    trip: {
      gtfs: {
        route_id: routeId,
        route_short_name: routeId,
        route_type: opts.routeType ?? 0,
        trip_id: `trip-${tripCounter}`,
      },
      air_conditioned: acStatus,
      vehicle_registration_number: opts.reg ?? tripCounter,
      start_timestamp: opts.start ?? "2026-04-19T11:00:00+02:00",
    },
    last_position: {
      tracking: opts.tracking ?? true,
    },
  };
}

// 14:00 Prague time (+02:00) — trip starts below are relative to this.
const FIXED_DATE = new Date("2026-04-19T12:00:00Z");

describe("analyze — tram mode", () => {
  it("aggregates AC status across all tram routes", () => {
    const result = analyze(
      [route("1"), route("22")],
      [vehicle("1", true), vehicle("1", false), vehicle("22", true), vehicle("22", false)],
      FIXED_DATE,
      "tram",
    );

    assert.equal(result.onTrack.totalVehicles, 4);
    assert.equal(result.onTrack.vehiclesWithAC, 2);
    assert.equal(result.onTrack.vehiclesWithoutAC, 2);
    assert.equal(result.onTrack.lineDetails.length, 2);
    assert.equal(result.lastUpdated, FIXED_DATE);
  });

  it("filters out non-tram vehicles (route_type !== 0)", () => {
    const tram = vehicle("1", true);
    const bus = vehicle("100", true, { routeType: 3 });

    const result = analyze([route("1")], [tram, bus], FIXED_DATE, "tram");
    assert.equal(result.onTrack.totalVehicles, 1);
    assert.equal(result.inService.totalVehicles, 1);
  });

  it("keeps non-tram routes out of lineDetails", () => {
    const result = analyze(
      [route("1"), route("B", "B", 1), route("119", "119", 3)],
      [vehicle("1", true)],
      FIXED_DATE,
      "tram",
    );
    assert.deepEqual(
      result.onTrack.lineDetails.map((line) => line.routeId),
      ["1"],
    );
  });

  it("excludes untracked layover records from onTrack but counts them in inService", () => {
    const result = analyze(
      [route("1"), route("22")],
      [
        vehicle("1", true, { reg: 9001 }),
        // Layover tram: finished a trip on line 1, next trip on line 22 —
        // two feed records, one physical vehicle.
        vehicle("1", false, { reg: 9002, tracking: false, start: "2026-04-19T13:20:00+02:00" }),
        vehicle("22", false, { reg: 9002, tracking: false, start: "2026-04-19T14:10:00+02:00" }),
      ],
      FIXED_DATE,
      "tram",
    );

    assert.equal(result.onTrack.totalVehicles, 1);
    assert.equal(result.onTrack.vehiclesWithAC, 1);
    assert.equal(result.inService.totalVehicles, 2);
    assert.equal(result.inService.vehiclesWithoutAC, 1);
  });

  it("attributes a layover tram to its next upcoming trip's line", () => {
    const result = analyze(
      [route("1"), route("17"), route("22")],
      [
        // Tracked anchor on an unrelated line so the empty-feed guard passes.
        vehicle("17", true, { reg: 9001 }),
        vehicle("1", false, { reg: 9002, tracking: false, start: "2026-04-19T13:20:00+02:00" }),
        vehicle("22", false, { reg: 9002, tracking: false, start: "2026-04-19T14:10:00+02:00" }),
      ],
      FIXED_DATE,
      "tram",
    );

    const line22 = result.inService.lineDetails.find((line) => line.routeId === "22");
    assert.equal(line22?.totalVehicles, 1);
    const line1 = result.inService.lineDetails.find((line) => line.routeId === "1");
    assert.equal(line1?.totalVehicles, 0);
  });

  it("prefers the tracked record when a vehicle also has untracked trip records", () => {
    const result = analyze(
      [route("1"), route("22")],
      [
        vehicle("1", true, { reg: 9003, tracking: true, start: "2026-04-19T13:30:00+02:00" }),
        vehicle("22", true, { reg: 9003, tracking: false, start: "2026-04-19T14:30:00+02:00" }),
      ],
      FIXED_DATE,
      "tram",
    );

    assert.equal(result.inService.totalVehicles, 1);
    const line1 = result.inService.lineDetails.find((line) => line.routeId === "1");
    assert.equal(line1?.totalVehicles, 1);
  });

  it("falls back to the most recent finished trip when no upcoming trip exists", () => {
    const result = analyze(
      [route("1"), route("17"), route("22")],
      [
        // Tracked anchor on an unrelated line so the empty-feed guard passes.
        vehicle("17", true, { reg: 9001 }),
        vehicle("1", false, { reg: 9004, tracking: false, start: "2026-04-19T12:00:00+02:00" }),
        vehicle("22", false, { reg: 9004, tracking: false, start: "2026-04-19T13:00:00+02:00" }),
      ],
      FIXED_DATE,
      "tram",
    );

    assert.equal(result.inService.totalVehicles, 2);
    const line22 = result.inService.lineDetails.find((line) => line.routeId === "22");
    assert.equal(line22?.totalVehicles, 1);
  });

  it("throws when the feed has no vehicles at all", () => {
    assert.throws(() => analyze([route("1")], [], FIXED_DATE, "tram"), /outage/);
  });

  it("throws when the feed has only untracked residual records", () => {
    assert.throws(
      () => analyze([route("1")], [vehicle("1", false, { tracking: false })], FIXED_DATE, "tram"),
      /outage/,
    );
  });
});

describe("analyze — bus mode", () => {
  const busRoutes = [
    route("119", "119", 3),
    route("59", "59", 11),
    route("907", "907", 3),
    route("303", "303", 3),
    route("22", "22", 0),
  ];

  it("counts city buses, trolleybuses and night lines; ignores trams and suburban lines", () => {
    const result = analyze(
      busRoutes,
      [
        vehicle("119", false, { routeType: 3 }),
        vehicle("119", true, { routeType: 3 }),
        vehicle("59", true, { routeType: 11 }),
        vehicle("907", false, { routeType: 3 }),
        vehicle("303", false, { routeType: 3 }),
        vehicle("22", false),
      ],
      FIXED_DATE,
      "bus",
    );

    assert.equal(result.onTrack.totalVehicles, 4);
    assert.equal(result.onTrack.vehiclesWithAC, 2);
    assert.equal(result.onTrack.vehiclesWithoutAC, 2);
    assert.deepEqual(
      result.onTrack.lineDetails.map((line) => line.routeId),
      ["119", "59", "907"],
    );
  });

  it("accepts the extended GTFS trolleybus route type (800)", () => {
    const result = analyze(
      [route("59", "59", 800)],
      [vehicle("59", true, { routeType: 800 })],
      FIXED_DATE,
      "bus",
    );
    assert.equal(result.onTrack.totalVehicles, 1);
  });

  it("throws when the feed has no tracked city buses", () => {
    assert.throws(
      () =>
        analyze(
          busRoutes,
          [vehicle("303", false, { routeType: 3 }), vehicle("22", false)],
          FIXED_DATE,
          "bus",
        ),
      /outage/,
    );
  });
});

describe("isCityBusLine", () => {
  it("accepts daytime city lines (100–299), school lines included", () => {
    assert.equal(isCityBusLine("100"), true);
    assert.equal(isCityBusLine("251"), true);
    assert.equal(isCityBusLine("299"), true);
  });

  it("accepts night city lines (900–939)", () => {
    assert.equal(isCityBusLine("907"), true);
    assert.equal(isCityBusLine("939"), true);
  });

  it("accepts trolleybus lines 58 and 59", () => {
    assert.equal(isCityBusLine("58"), true);
    assert.equal(isCityBusLine("59"), true);
  });

  it("rejects suburban day and night lines", () => {
    assert.equal(isCityBusLine("300"), false);
    assert.equal(isCityBusLine("799"), false);
    assert.equal(isCityBusLine("941"), false);
  });

  it("rejects non-numeric specials (AE, tram-replacement X-lines)", () => {
    assert.equal(isCityBusLine("AE"), false);
    assert.equal(isCityBusLine("X22"), false);
  });
});
