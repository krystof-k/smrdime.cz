import type { TramStatusHub } from "@/worker/tram-status-hub";

const HUB_NAME = "prague";

/**
 * Resolves a stub for the globally-named TramStatusHub Durable Object. Kept
 * separate from the DO implementation so Node-side callers (page SSR,
 * `/api/tram/stream` route) don't pull `cloudflare:workers` into the Next.js
 * dev bundle — `import type` above is erased at compile time.
 */
export function getTramHub(env: CloudflareEnv): DurableObjectStub<TramStatusHub> {
  return env.TRAM_HUB.get(env.TRAM_HUB.idFromName(HUB_NAME));
}
