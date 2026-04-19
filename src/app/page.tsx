import { getCloudflareContext } from "@opennextjs/cloudflare";
import TramStatus from "@/components/TramStatus";
import type { TramAnalysisResult } from "@/lib/tram-analysis";
import { getTramHub } from "@/lib/tram-hub-client";

export const dynamic = "force-dynamic";

async function loadInitialSnapshot(): Promise<TramAnalysisResult | null> {
  try {
    const { env } = getCloudflareContext({ async: false });
    const hub = env.TRAM_HUB;
    if (!hub) return null;
    const response = await getTramHub(env).fetch("https://hub/snapshot");
    if (!response.ok) return null;
    return (await response.json()) as TramAnalysisResult;
  } catch {
    // In `next dev` without the Cloudflare platform proxy, or when Golemio
    // is unreachable, SSR degrades to the client-side WebSocket seed.
    return null;
  }
}

export default async function Home() {
  const initialSnapshot = await loadInitialSnapshot();
  return <TramStatus initialSnapshot={initialSnapshot} />;
}
