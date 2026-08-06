import type { VehicleMode } from "./vehicle-modes.ts";

// X (and Slack, etc.) cache the OG card per URL and give no way to force a
// refresh — once they've scraped a bare page they keep serving that card.
// A unique token per share makes each shared link look new, so the platform
// re-scrapes and shows the current numbers instead of a stale snapshot.
const SITE_URL = "https://www.smrdime.cz";

export function buildShareUrl(token: number, path = "/"): string {
  return `${SITE_URL}${path}?s=${token.toString(36)}`;
}

/**
 * The og:image URL for a given cache-bust value: the 30s bucket on plain
 * page scrapes, or the share token on shared links — the share button
 * prewarms exactly this URL, so the platform's scraper finds the card
 * already rendered.
 */
export function buildOgImagePath(mode: VehicleMode, t: string): string {
  return `/og?${mode === "bus" ? "v=bus&" : ""}t=${t}`;
}

/**
 * A share token from the `?s=` query param, or undefined for anything that
 * doesn't look like one (tokens are base36 timestamps, see buildShareUrl).
 */
export function shareTokenFrom(raw: string | undefined): string | undefined {
  return raw && /^[0-9a-z]{1,16}$/.test(raw) ? raw : undefined;
}
