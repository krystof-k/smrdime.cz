import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { percentWithoutAC, roundPercent } from "../lib/ratios.ts";

describe("roundPercent", () => {
  it("rounds to nearest integer", () => {
    assert.equal(roundPercent(1, 3), 33);
    assert.equal(roundPercent(2, 3), 67);
    assert.equal(roundPercent(1, 2), 50);
  });

  it("returns 0 when denominator is zero", () => {
    assert.equal(roundPercent(5, 0), 0);
  });

  it("returns 0 when denominator is negative", () => {
    assert.equal(roundPercent(5, -1), 0);
  });

  it("returns 100 when numerator equals denominator", () => {
    assert.equal(roundPercent(7, 7), 100);
  });
});

describe("percentWithoutAC", () => {
  it("computes the rounded percentage from analysis result fields", () => {
    assert.equal(
      percentWithoutAC({
        totalVehicles: 120,
        vehiclesWithoutAC: 80,
        vehiclesWithAC: 40,
        lastUpdated: new Date(),
        lineDetails: [],
      }),
      67,
    );
  });

  it("returns 0 when there are no vehicles", () => {
    assert.equal(
      percentWithoutAC({
        totalVehicles: 0,
        vehiclesWithoutAC: 0,
        vehiclesWithAC: 0,
        lastUpdated: new Date(),
        lineDetails: [],
      }),
      0,
    );
  });
});
