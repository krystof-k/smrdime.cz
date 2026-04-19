import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getACBackgroundColor,
  getACEmoji,
  getTemperatureColor,
  getTemperatureEmoji,
  NEUTRAL_TEXT_COLOR,
} from "../lib/display.ts";

describe("getACEmoji", () => {
  it("shows the supplied cool emoji when cool (< 22°C)", () => {
    assert.equal(getACEmoji(0, 15, "🚋"), "🚋");
    assert.equal(getACEmoji(100, 15, "🚋"), "🚋");
    assert.equal(getACEmoji(0, 15, "🚌"), "🚌");
    assert.equal(getACEmoji(100, 15, "🚌"), "🚌");
  });
  it("caps emoji severity based on temperature tier", () => {
    assert.equal(getACEmoji(0, 22, "🚋"), "😐");
    assert.equal(getACEmoji(0, 27, "🚋"), "☀️");
    assert.equal(getACEmoji(0, 32, "🚋"), "🔥");
    assert.equal(getACEmoji(0, 40, "🚋"), "💀");
  });
  it("shows the best emoji at 90%+ AC coverage", () => {
    assert.equal(getACEmoji(95, 30, "🚋"), "❄️");
  });
  it("does not flash red/💀 while temperature is unknown", () => {
    assert.notEqual(getACEmoji(0, null, "🚋"), "💀");
    assert.notEqual(getACEmoji(0, null, "🚋"), "🔥");
    assert.notEqual(getACEmoji(0, null, "🚋"), "☀️");
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
