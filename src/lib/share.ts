// X (and Slack, etc.) cache the OG card per URL and give no way to force a
// refresh — once they've scraped a bare page they keep serving that card.
// A unique token per share makes each shared link look new, so the platform
// re-scrapes and shows the current numbers instead of a stale snapshot.
const SITE_URL = "https://www.smrdime.cz";

export function buildShareUrl(token: number, path = "/"): string {
  return `${SITE_URL}${path}?s=${token.toString(36)}`;
}
