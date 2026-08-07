/**
 * Cloudflare caches a Worker's *outbound* subrequests, not the response the
 * Worker itself returns — a Worker response is never stored in the zone cache
 * without a Cache Rule, which is why our routes' `Cache-Control: s-maxage`
 * protects nothing upstream on its own (`curl -I` on /api/* shows no
 * `cf-cache-status` at all). Marking the upstream fetch cacheable is what
 * actually collapses many Worker invocations into one upstream request per
 * TTL, which is what the upstream rate limits count.
 *
 * Two things to keep in mind: the cache is per data centre, not global — fine
 * here, our traffic is overwhelmingly PRG — and `cf` is honoured only by a
 * deployed Worker, so `next dev` and the unit tests still call upstream every
 * time.
 */

// `cf` is a Cloudflare extension to RequestInit that the DOM lib doesn't
// declare. @cloudflare/workers-types would declare it, but it also redefines
// fetch/Request/Response and clashes with the DOM lib this app compiles
// against, so widen just this one field instead.
type EdgeCachedInit = RequestInit & {
  cf: { cacheTtl: number; cacheEverything: boolean };
};

/**
 * Adds Cloudflare's cache directives to a fetch init. `cacheEverything` makes
 * the edge store the response whatever the upstream's own `Cache-Control`
 * says; `cacheTtl` then decides how long that one shared copy is served.
 */
export function withEdgeCache(ttlSeconds: number, init: RequestInit = {}): EdgeCachedInit {
  return { ...init, cf: { cacheTtl: ttlSeconds, cacheEverything: true } };
}
