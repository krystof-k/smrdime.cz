import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Upstream responses are cached in the colo that served the request, so many
 * Worker invocations collapse into one upstream call per TTL. That is what
 * protects the upstream quotas — `Cache-Control: s-maxage` on our own routes
 * does not, because a Worker response is never stored in the zone cache
 * without a Cache Rule.
 *
 * We do this by hand rather than with `fetch(url, { cf: { cacheTtl } })`. That
 * option deduplicated nothing in production — measured, not assumed: every poll
 * still reached Golemio, which serves the API from behind Cloudflare itself,
 * where Worker subrequest caching is unreliable. The Cache API demonstrably
 * works on this zone (it is what keeps the OG render cached) and, unlike `cf`,
 * it can be exercised in local workerd before shipping. The cost is doing the
 * match/put by hand; the benefit is a mechanism we can observe and control.
 *
 * Two things to keep in mind: the cache is per data centre, not global — fine
 * here, our traffic is overwhelmingly PRG — and `caches.default` only exists in
 * the Worker runtime, so `next dev` calls upstream every time.
 */

// The DOM lib's CacheStorage doesn't declare `default`, and workerd implements
// only these members of it (keys/matchAll/add all throw "not implemented"), so
// describe what's actually there rather than borrowing the DOM `Cache` type.
type ColoCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

/**
 * Undefined outside the Worker runtime — `next dev` and the unit tests, which
 * exercise the plain-fetch path through `cachedFetch` because of it.
 */
export function coloCache(): ColoCache | undefined {
  if (typeof caches === "undefined") return undefined;
  return (caches as unknown as { default: ColoCache }).default;
}

// getCloudflareContext types `ctx` as workerd's ExecutionContext, which lands as
// `any` without @cloudflare/workers-types. Name the one method we call so a
// typo can't slip through untyped.
type ExecutionCtx = { waitUntil(promise: Promise<unknown>): void };

export function waitUntil(promise: Promise<unknown>): void {
  const { ctx } = getCloudflareContext<Record<string, unknown>, ExecutionCtx>();
  ctx.waitUntil(promise);
}

/**
 * When we stored a copy. The Cache API rewrites `Date` to the store time and
 * `Age` is unreliable in local workerd, so stamp our own header rather than
 * depend on either.
 */
const CAPTURED_AT = "x-captured-at";

/**
 * When the payload behind a response was actually fetched from upstream, rather
 * than when we read it. A cache hit can be most of a TTL old, and without this
 * the site clock would report stale vehicle positions as if they had just
 * arrived. A response we fetched ourselves carries no stamp and is simply now.
 */
export function capturedAtFrom(headers: Headers, now: Date): Date {
  const stamped = Date.parse(headers.get(CAPTURED_AT) ?? "");
  return Number.isNaN(stamped) ? now : new Date(stamped);
}

/**
 * `fetch` with the response kept in the colo cache for `ttlSeconds`, keyed on
 * the URL alone — deliberately, so a shared copy serves everyone. That is
 * correct for both upstreams here: neither call carries anything
 * request-specific, and an API key in `headers` is our own server-side
 * credential over a public feed, not a per-user one.
 *
 * Only successful responses are stored, so an upstream error can't outlive its
 * own request and lock us out for the rest of the TTL.
 */
export async function cachedFetch(
  url: string,
  { ttlSeconds, ...init }: RequestInit & { ttlSeconds: number },
): Promise<Response> {
  const cache = coloCache();
  if (!cache) return fetch(url, init);

  const key = new Request(url);
  const hit = await cache.match(key);
  if (hit) return hit;

  const response = await fetch(url, init);
  if (!response.ok) return response;

  // Upstream sends no usable freshness of its own, so the stored copy carries
  // ours. Cloning the body streams one branch to the cache and one to the
  // caller instead of buffering the whole payload twice.
  const stored = new Response(response.clone().body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": `public, s-maxage=${ttlSeconds}`,
      [CAPTURED_AT]: new Date().toISOString(),
    },
  });
  waitUntil(cache.put(key, stored).catch(() => {}));

  return response;
}
