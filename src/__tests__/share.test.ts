import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOgImagePath, buildShareUrl, shareTokenFrom } from "../lib/share.ts";

describe("buildShareUrl", () => {
  it("appends a base36 cache-bust token to the site URL", () => {
    assert.equal(buildShareUrl(0), "https://www.smrdime.cz/?s=0");
    assert.equal(buildShareUrl(1_000_000), `https://www.smrdime.cz/?s=${(1_000_000).toString(36)}`);
  });

  it("shares the given page, so bus links land on /autobusy", () => {
    assert.equal(buildShareUrl(0, "/autobusy"), "https://www.smrdime.cz/autobusy?s=0");
  });

  it("gives a distinct URL for distinct tokens, so each share looks new", () => {
    assert.notEqual(buildShareUrl(1), buildShareUrl(2));
  });
});

describe("buildOgImagePath", () => {
  it("builds mode-specific og image paths", () => {
    assert.equal(buildOgImagePath("tram", "k3x9"), "/og?t=k3x9");
    assert.equal(buildOgImagePath("bus", "k3x9"), "/og?v=bus&t=k3x9");
  });
});

describe("shareTokenFrom", () => {
  it("accepts base36 share tokens", () => {
    const token = (1_722_950_000_000).toString(36);
    assert.equal(shareTokenFrom(token), token);
    assert.equal(shareTokenFrom("0"), "0");
  });

  it("rejects missing or non-token values", () => {
    assert.equal(shareTokenFrom(undefined), undefined);
    assert.equal(shareTokenFrom(""), undefined);
    assert.equal(shareTokenFrom("DROP TABLE"), undefined);
    assert.equal(shareTokenFrom("a".repeat(17)), undefined);
  });
});
