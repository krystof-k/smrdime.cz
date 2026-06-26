import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildShareUrl } from "../lib/share.ts";

describe("buildShareUrl", () => {
  it("appends a base36 cache-bust token to the site URL", () => {
    assert.equal(buildShareUrl(0), "https://www.smrdime.cz/?s=0");
    assert.equal(buildShareUrl(1_000_000), `https://www.smrdime.cz/?s=${(1_000_000).toString(36)}`);
  });

  it("gives a distinct URL for distinct tokens, so each share looks new", () => {
    assert.notEqual(buildShareUrl(1), buildShareUrl(2));
  });
});
