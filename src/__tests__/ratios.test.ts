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
        totalTrams: 120,
        tramsWithoutAC: 80,
        tramsWithAC: 40,
        lastUpdated: new Date(),
        lineDetails: [],
      }),
      67,
    );
  });

  it("returns 0 when there are no trams", () => {
    assert.equal(
      percentWithoutAC({
        totalTrams: 0,
        tramsWithoutAC: 0,
        tramsWithAC: 0,
        lastUpdated: new Date(),
        lineDetails: [],
      }),
      0,
    );
  });
});
