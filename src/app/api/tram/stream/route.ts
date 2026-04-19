import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getTramHub } from "@/lib/tram-hub-client";

/**
 * Forwards the `Upgrade: websocket` request to the TramStatusHub Durable
 * Object, which holds the shared snapshot and fan-outs updates to every
 * connected tab.
 */
export async function GET(request: Request): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected websocket upgrade", { status: 426 });
  }

  const { env } = getCloudflareContext();
  return getTramHub(env).fetch(request);
}
