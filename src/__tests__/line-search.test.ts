import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterLinesByQuery } from "../lib/line-search.ts";
import type { LineInfo } from "../lib/vehicle-analysis.ts";

function line(lineNumber: string): LineInfo {
  return {
    lineNumber,
    routeId: `L${lineNumber}`,
    totalVehicles: 10,
    vehiclesWithAC: 5,
    vehiclesWithoutAC: 5,
  };
}

const lines = [line("9"), line("22"), line("2"), line("91")];

describe("filterLinesByQuery", () => {
  it("returns all lines for an empty query", () => {
    assert.deepEqual(filterLinesByQuery(lines, ""), lines);
  });

  it("returns all lines for a whitespace-only query", () => {
    assert.deepEqual(filterLinesByQuery(lines, "   "), lines);
  });

  it("matches by line number prefix", () => {
    assert.deepEqual(
      filterLinesByQuery(lines, "9").map((l) => l.lineNumber),
      ["9", "91"],
    );
  });

  it("matches an exact line number", () => {
    assert.deepEqual(
      filterLinesByQuery(lines, "22").map((l) => l.lineNumber),
      ["22"],
    );
  });

  it("trims the query before matching", () => {
    assert.deepEqual(
      filterLinesByQuery(lines, " 2 ").map((l) => l.lineNumber),
      ["22", "2"],
    );
  });

  it("returns an empty array when nothing matches", () => {
    assert.deepEqual(filterLinesByQuery(lines, "42"), []);
  });
});
