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

  it("pins the OG image to the share token when one is present", () => {
    const tram = buildPageMetadata("tram", "k3x9");
    assert.equal((tram.openGraph as unknown as OgImages).images[0].url, "/og?t=k3x9");
    const bus = buildPageMetadata("bus", "k3x9");
    assert.equal((bus.openGraph as unknown as OgImages).images[0].url, "/og?v=bus&t=k3x9");
  });

  it("keeps openGraph and twitter cards in sync", () => {
    const meta = buildPageMetadata("bus");
    const og = (meta.openGraph as unknown as OgImages).images[0];
    const tw = (meta.twitter as unknown as OgImages).images[0];
    assert.equal(og.url, tw.url);
  });
});
