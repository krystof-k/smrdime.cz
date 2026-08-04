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

describe("analyze", () => {
  it("aggregates AC status across all tram routes", () => {
    const result = analyze(
      [route("1"), route("22")],
      [vehicle("1", true), vehicle("1", false), vehicle("22", true), vehicle("22", false)],
      FIXED_DATE,
    );

    assert.equal(result.onTrack.totalTrams, 4);
    assert.equal(result.onTrack.tramsWithAC, 2);
    assert.equal(result.onTrack.tramsWithoutAC, 2);
    assert.equal(result.onTrack.lineDetails.length, 2);
    assert.equal(result.lastUpdated, FIXED_DATE);
  });

  it("filters out non-tram vehicles (route_type !== 0)", () => {
    const tram = vehicle("1", true);
    const bus = vehicle("100", true, { routeType: 3 });

    const result = analyze([route("1")], [tram, bus], FIXED_DATE);
    assert.equal(result.onTrack.totalTrams, 1);
    assert.equal(result.inService.totalTrams, 1);
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
    );

    assert.equal(result.onTrack.totalTrams, 1);
    assert.equal(result.onTrack.tramsWithAC, 1);
    assert.equal(result.inService.totalTrams, 2);
    assert.equal(result.inService.tramsWithoutAC, 1);
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
    );

    assert.equal(result.inService.totalTrams, 1);
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
    );

    assert.equal(result.inService.totalTrams, 2);
    const line22 = result.inService.lineDetails.find((line) => line.routeId === "22");
    assert.equal(line22?.totalVehicles, 1);
  });

  it("throws when the feed has no vehicles at all", () => {
    assert.throws(() => analyze([route("1")], [], FIXED_DATE), /outage/);
  });

  it("throws when the feed has only untracked residual records", () => {
    assert.throws(
      () => analyze([route("1")], [vehicle("1", false, { tracking: false })], FIXED_DATE),
      /outage/,
    );
  });
});
