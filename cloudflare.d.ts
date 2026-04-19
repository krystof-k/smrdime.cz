/// <reference types="@cloudflare/workers-types" />

import type { TramStatusHub } from "./src/worker/tram-status-hub.ts";

declare global {
  interface CloudflareEnv {
    TRAM_HUB: DurableObjectNamespace<TramStatusHub>;
  }
}
