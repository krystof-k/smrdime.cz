import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPageMetadata } from "../lib/page-metadata.ts";

type OgImages = { images: Array<{ url: string; alt: string }> };

describe("buildPageMetadata", () => {
  it("gives the tram page the default OG image URL", () => {
    const meta = buildPageMetadata("tram");
    const image = (meta.openGraph as unknown as OgImages).images[0];
    assert.match(image.url, /^\/og\?t=\d+$/);
    assert.match(String(meta.title), /tramvají/);
  });

  it("gives the bus page a bus-variant OG image URL and bus texts", () => {
    const meta = buildPageMetadata("bus");
    const image = (meta.openGraph as unknown as OgImages).images[0];
    assert.match(image.url, /^\/og\?v=bus&t=\d+$/);
    assert.match(String(meta.title), /autobusů/);
    assert.match(String(meta.description), /autobusů/);
  });

  it("keeps openGraph and twitter cards in sync", () => {
    const meta = buildPageMetadata("bus");
    const og = (meta.openGraph as unknown as OgImages).images[0];
    const tw = (meta.twitter as unknown as OgImages).images[0];
    assert.equal(og.url, tw.url);
  });
});
