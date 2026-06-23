import TramStatus from "@/components/TramStatus";

// Rendered per request so generateMetadata's og:image cache-bust bucket stays
// current. The page is a thin client shell, so SSR-ing it each load is cheap.
export const dynamic = "force-dynamic";

export default function Home() {
  return <TramStatus />;
}
