import type { Metadata } from "next";
import { buildOgImagePath } from "./share.ts";
import { VEHICLE_MODES, type VehicleMode } from "./vehicle-modes.ts";

// The og:image URL is unique per scrape: shared links pin it to their share
// token (the share button pre-rendered that exact URL), everything else gets
// a 30s time bucket so a platform re-scraping the page pulls a fresh render
// instead of its cached copy. Needs the page rendered dynamically (see
// `dynamic` in the page files), otherwise the bucket freezes at build.
export function buildPageMetadata(mode: VehicleMode, shareToken?: string): Metadata {
  const { title, description } = VEHICLE_MODES[mode];
  const t = shareToken ?? String(Math.floor(Date.now() / 30_000));
  // Dimensions match the 2x-supersampled /og output (1200x630 logical).
  const image = { url: buildOgImagePath(mode, t), width: 2400, height: 1260, alt: title };
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "cs_CZ",
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
