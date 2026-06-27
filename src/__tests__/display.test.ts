import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getACBackgroundColor,
  getACEmoji,
  getTemperatureColor,
  getTemperatureEmoji,
  getTemperatureHex,
  NEUTRAL_HEX,
  NEUTRAL_TEXT_COLOR,
} from "../lib/display.ts";

describe("getACEmoji", () => {
  it("shows only the tram emoji when cool (< 22°C)", () => {
    assert.equal(getACEmoji(0, 15), "🚋");
    assert.equal(getACEmoji(100, 15), "🚋");
  });
  it("caps emoji severity based on temperature tier", () => {
    assert.equal(getACEmoji(0, 22), "😐");
    assert.equal(getACEmoji(0, 27), "☀️");
    assert.equal(getACEmoji(0, 32), "🔥");
    assert.equal(getACEmoji(0, 40), "💀");
  });
  it("shows the best emoji at 90%+ AC coverage", () => {
    assert.equal(getACEmoji(95, 30), "🧊");
  });
  it("does not flash red/💀 while temperature is unknown", () => {
    assert.notEqual(getACEmoji(0, null), "💀");
    assert.notEqual(getACEmoji(0, null), "🔥");
    assert.notEqual(getACEmoji(0, null), "☀️");
  });
});

describe("getACBackgroundColor", () => {
  it("returns a neutral grey when cool, regardless of AC %", () => {
    const lightCool = getACBackgroundColor(0, 15, false);
    const darkCool = getACBackgroundColor(0, 15, true);
    assert.match(lightCool, /^rgb\(/);
    assert.match(darkCool, /^rgb\(/);
    assert.notEqual(lightCool, darkCool);
  });
  it("uses the OKLCH-derived color when warm", () => {
    const warm = getACBackgroundColor(0, 30, false);
    assert.match(warm, /^oklch\(/);
  });
  it("falls back to the neutral severity cap when temperature is unknown", () => {
    // Null temp must not render as red/💀 in the gap before weather loads.
    const unknown = getACBackgroundColor(0, null, false);
    const hotRed = getACBackgroundColor(0, 40, false);
    assert.notEqual(unknown, hotRed);
    assert.match(unknown, /^oklch\(/);
  });
});

describe("getTemperatureColor", () => {
  it("returns hottest tier for extreme heat", () => {
    assert.equal(getTemperatureColor(40), "text-red-600 dark:text-red-400");
  });
  it("returns coldest tier for sub-zero", () => {
    assert.equal(getTemperatureColor(-10), "text-blue-900 dark:text-blue-200");
  });
  it("differs from the neutral fallback for any known temperature", () => {
    assert.notEqual(getTemperatureColor(20), NEUTRAL_TEXT_COLOR);
  });
});

describe("getTemperatureEmoji", () => {
  it("returns the matching tier emoji", () => {
    assert.equal(getTemperatureEmoji(40), "🔥💀");
    assert.equal(getTemperatureEmoji(25), "☀️😩");
    assert.equal(getTemperatureEmoji(0), "🧊🤬");
  });
});

// getTemperatureHex feeds the OG renderer (Satori can't read Tailwind classes),
// so it must stay in lock-step with the textColor tiers. These literals guard
// against the hex drifting away from its class.
describe("getTemperatureHex", () => {
  it("returns the hottest tier's hex for extreme heat", () => {
    assert.equal(getTemperatureHex(40), "#e7000b");
  });
  it("returns the coldest tier's hex for sub-zero", () => {
    assert.equal(getTemperatureHex(-10), "#1c398e");
  });
  it("snaps to the tier at the boundary", () => {
    assert.equal(getTemperatureHex(35), "#e7000b");
    assert.equal(getTemperatureHex(34), "#ff6900");
    assert.equal(getTemperatureHex(22), "#00c950");
  });
  it("differs from the neutral fallback for any known temperature", () => {
    assert.notEqual(getTemperatureHex(20), NEUTRAL_HEX);
  });
});
