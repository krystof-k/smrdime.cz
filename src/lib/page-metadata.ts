import type { Metadata } from "next";
import { VEHICLE_MODES, type VehicleMode } from "./vehicle-modes.ts";

// A 30s time bucket busts the og:image URL so a platform re-scraping the page
// pulls a fresh render instead of its cached copy. Matches the /og edge TTL, so
// repeat scrapes within a bucket still hit the cache. Needs the page rendered
// dynamically (see `dynamic` in the page files), otherwise the bucket freezes
// at build.
export function buildPageMetadata(mode: VehicleMode): Metadata {
  const { title, description } = VEHICLE_MODES[mode];
  const bucket = Math.floor(Date.now() / 30_000);
  const modeParam = mode === "tram" ? "" : `v=${mode}&`;
  // Dimensions match the 2x-supersampled /og output (1200x630 logical).
  const image = { url: `/og?${modeParam}t=${bucket}`, width: 2400, height: 1260, alt: title };
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
