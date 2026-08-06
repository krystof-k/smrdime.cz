import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Route, VehiclePosition } from "../lib/golemio-api.ts";
import { percentWithoutAC } from "../lib/ratios.ts";
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
  acStatus: boolean | null,
  opts: {
    reg?: number | null;
    tracking?: boolean;
    start?: string;
    routeType?: number;
    statePosition?: string;
  } = {},
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
      vehicle_registration_number: opts.reg === undefined ? tripCounter : opts.reg,
      start_timestamp: opts.start ?? "2026-04-19T11:00:00+02:00",
    },
    last_position: {
      tracking: opts.tracking ?? true,
      state_position: opts.statePosition,
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

  it("counts an unregistered vehicle only while tracked", () => {
    const result = analyze(
      [route("1"), route("22")],
      [
        vehicle("1", true, { reg: 9001 }),
        vehicle("1", false, { reg: null, tracking: true }),
        // Untracked no-registration records can't be tied to a vehicle, so
        // they must not each count as one more vehicle in service.
        vehicle("1", false, {
          reg: null,
          tracking: false,
          start: "2026-04-19T14:10:00+02:00",
          statePosition: "before_track",
        }),
        vehicle("22", false, {
          reg: null,
          tracking: false,
          start: "2026-04-19T14:40:00+02:00",
          statePosition: "before_track",
        }),
      ],
      FIXED_DATE,
      "tram",
    );

    assert.equal(result.onTrack.totalVehicles, 2);
    assert.equal(result.inService.totalVehicles, 2);
  });

  it("attributes a delayed, not-yet-departed trip to its own line", () => {
    const result = analyze(
      [route("1"), route("17"), route("22")],
      [
        // Tracked anchor on an unrelated line so the empty-feed guard passes.
        vehicle("17", true, { reg: 9001 }),
        // Scheduled before "now" but still waiting to depart (delayed) —
        // the vehicle serves this trip next, not the later one.
        vehicle("1", false, {
          reg: 9002,
          tracking: false,
          start: "2026-04-19T13:55:00+02:00",
          statePosition: "before_track_delayed",
        }),
        vehicle("22", false, {
          reg: 9002,
          tracking: false,
          start: "2026-04-19T14:30:00+02:00",
          statePosition: "before_track",
        }),
      ],
      FIXED_DATE,
      "tram",
    );

    const line1 = result.inService.lineDetails.find((line) => line.routeId === "1");
    assert.equal(line1?.totalVehicles, 1);
    const line22 = result.inService.lineDetails.find((line) => line.routeId === "22");
    assert.equal(line22?.totalVehicles, 0);
  });

  it("dedupes two simultaneously tracked records of one vehicle", () => {
    const result = analyze(
      [route("1"), route("22")],
      [
        vehicle("1", true, { reg: 9003, tracking: true }),
        vehicle("22", true, { reg: 9003, tracking: true }),
      ],
      FIXED_DATE,
      "tram",
    );

    assert.equal(result.onTrack.totalVehicles, 1);
    assert.equal(result.inService.totalVehicles, 1);
  });

  it("keeps unknown-AC vehicles in the without-AC percentage denominator", () => {
    const result = analyze(
      [route("1")],
      [vehicle("1", true), vehicle("1", false), vehicle("1", null)],
      FIXED_DATE,
      "tram",
    );
    assert.equal(percentWithoutAC(result.onTrack), 33);
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

  it("includes every trolleybus line by route type alone, without a number gate", () => {
    const result = analyze(
      [route("51", "51", 11)],
      [vehicle("51", true, { routeType: 11 })],
      FIXED_DATE,
      "bus",
    );
    assert.equal(result.onTrack.totalVehicles, 1);
  });

  it("flags trolleybus lines so the UI can show them with their own emoji", () => {
    const result = analyze(
      [route("59", "59", 11), route("119", "119", 3)],
      [vehicle("59", true, { routeType: 11 }), vehicle("119", true, { routeType: 3 })],
      FIXED_DATE,
      "bus",
    );
    const byLine = new Map(result.onTrack.lineDetails.map((line) => [line.lineNumber, line]));
    assert.equal(byLine.get("59")?.isTrolleybus, true);
    assert.equal(byLine.get("119")?.isTrolleybus, false);
  });

  it("counts unknown AC status into totals but into neither AC bucket", () => {
    // Golemio docs: null = "the information is not available" — claiming
    // such a vehicle rides without AC would be made up.
    const result = analyze(
      [route("119", "119", 3)],
      [
        vehicle("119", true, { routeType: 3 }),
        vehicle("119", false, { routeType: 3 }),
        vehicle("119", null, { routeType: 3 }),
      ],
      FIXED_DATE,
      "bus",
    );
    assert.equal(result.onTrack.totalVehicles, 3);
    assert.equal(result.onTrack.vehiclesWithAC, 1);
    assert.equal(result.onTrack.vehiclesWithoutAC, 1);
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
    // 900 itself doesn't exist (lines run 901–917), but sits inside the
    // deliberate window; 940 is the first number past it.
    assert.equal(isCityBusLine("900"), true);
    assert.equal(isCityBusLine("907"), true);
    assert.equal(isCityBusLine("939"), true);
    assert.equal(isCityBusLine("940"), false);
  });

  it("rejects trolleybus numbers — those qualify by route type, not number", () => {
    assert.equal(isCityBusLine("58"), false);
    assert.equal(isCityBusLine("59"), false);
  });

  it("rejects suburban day and night lines and sub-100 numbers", () => {
    assert.equal(isCityBusLine("99"), false);
    assert.equal(isCityBusLine("300"), false);
    assert.equal(isCityBusLine("799"), false);
    assert.equal(isCityBusLine("951"), false);
  });

  it("rejects non-numeric specials (AE, X-lines, other towns' MHD)", () => {
    assert.equal(isCityBusLine("AE"), false);
    assert.equal(isCityBusLine("X22"), false);
    assert.equal(isCityBusLine("MHD 1"), false);
  });
});
