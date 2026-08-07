import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withEdgeCache } from "../lib/edge-cache.ts";

describe("withEdgeCache", () => {
  it("marks the subrequest cacheable for the given TTL", () => {
    assert.deepEqual(withEdgeCache(300).cf, { cacheTtl: 300, cacheEverything: true });
  });

  it("keeps the caller's init, so the API key header and timeout still travel", () => {
    const { signal } = new AbortController();
    const init = withEdgeCache(30, { headers: { "X-Access-Token": "k" }, signal });

    assert.deepEqual(init.headers, { "X-Access-Token": "k" });
    assert.equal(init.signal, signal);
    assert.equal(init.cf.cacheTtl, 30);
  });
});
