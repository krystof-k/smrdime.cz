import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { capturedAtFrom } from "../lib/edge-cache.ts";

describe("capturedAtFrom", () => {
  const now = new Date("2026-08-09T12:00:30Z");

  it("reports when a cached copy was stored, not when we read it", () => {
    const headers = new Headers({ "x-captured-at": "2026-08-09T12:00:03.000Z" });
    assert.equal(capturedAtFrom(headers, now).toISOString(), "2026-08-09T12:00:03.000Z");
  });

  it("treats an unstamped response — one we just fetched — as captured now", () => {
    assert.equal(capturedAtFrom(new Headers(), now).getTime(), now.getTime());
  });

  it("falls back to now rather than propagating an unparseable stamp", () => {
    const headers = new Headers({ "x-captured-at": "recently" });
    assert.equal(capturedAtFrom(headers, now).getTime(), now.getTime());
  });
});
