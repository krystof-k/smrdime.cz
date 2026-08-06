import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { vehicleNoun } from "../lib/vehicle-modes.ts";

describe("vehicleNoun", () => {
  it("declines Czech counts: 1 tramvaj, 2–4 tramvaje, 5+ tramvají", () => {
    assert.equal(vehicleNoun("tram", 1), "tramvaj");
    assert.equal(vehicleNoun("tram", 2), "tramvaje");
    assert.equal(vehicleNoun("tram", 4), "tramvaje");
    assert.equal(vehicleNoun("tram", 5), "tramvají");
    assert.equal(vehicleNoun("tram", 80), "tramvají");
  });

  it("declines buses the same way, including zero", () => {
    assert.equal(vehicleNoun("bus", 0), "autobusů");
    assert.equal(vehicleNoun("bus", 1), "autobus");
    assert.equal(vehicleNoun("bus", 3), "autobusy");
    assert.equal(vehicleNoun("bus", 45), "autobusů");
  });
});
