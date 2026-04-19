import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapshotsEqual } from "../lib/snapshot-equal.ts";
import type { TramAnalysisResult, TramLineInfo } from "../lib/tram-analysis.ts";

function line(overrides: Partial<TramLineInfo> = {}): TramLineInfo {
  return {
    lineNumber: "9",
    routeId: "route-9",
    totalVehicles: 10,
    vehiclesWithAC: 4,
    vehiclesWithoutAC: 6,
    status: "completed",
    ...overrides,
  };
}

function snapshot(overrides: Partial<TramAnalysisResult> = {}): TramAnalysisResult {
  return {
    totalTrams: 10,
    tramsWithAC: 4,
    tramsWithoutAC: 6,
    lastUpdated: new Date("2026-04-19T12:00:00Z"),
    lineDetails: [line()],
    ...overrides,
  };
}

describe("snapshotsEqual", () => {
  it("treats null pairs as equal, null vs. value as unequal", () => {
    assert.equal(snapshotsEqual(null, null), true);
    assert.equal(snapshotsEqual(null, snapshot()), false);
    assert.equal(snapshotsEqual(snapshot(), null), false);
  });

  it("ignores lastUpdated", () => {
    const a = snapshot({ lastUpdated: new Date("2026-04-19T12:00:00Z") });
    const b = snapshot({ lastUpdated: new Date("2026-04-19T12:00:30Z") });
    assert.equal(snapshotsEqual(a, b), true);
  });

  it("catches changes in totals", () => {
    const a = snapshot();
    const b = snapshot({ tramsWithAC: 5, tramsWithoutAC: 5 });
    assert.equal(snapshotsEqual(a, b), false);
  });

  it("catches per-line differences", () => {
    const a = snapshot();
    const b = snapshot({ lineDetails: [line({ vehiclesWithAC: 5, vehiclesWithoutAC: 5 })] });
    assert.equal(snapshotsEqual(a, b), false);
  });

  it("catches lineDetails length changes", () => {
    const a = snapshot({ lineDetails: [line()] });
    const b = snapshot({ lineDetails: [line(), line({ lineNumber: "22", routeId: "route-22" })] });
    assert.equal(snapshotsEqual(a, b), false);
  });

  it("catches reorderings (order is part of identity)", () => {
    const nine = line({ lineNumber: "9", routeId: "route-9" });
    const twenty = line({ lineNumber: "22", routeId: "route-22" });
    const a = snapshot({ lineDetails: [nine, twenty] });
    const b = snapshot({ lineDetails: [twenty, nine] });
    assert.equal(snapshotsEqual(a, b), false);
  });
});
