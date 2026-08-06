import VehicleStatus from "@/components/VehicleStatus";
import { buildPageMetadata } from "@/lib/page-metadata";
import { shareTokenFrom } from "@/lib/share";

// Rendered per request so generateMetadata's og:image cache-bust bucket stays
// current. The page is a thin client shell, so SSR-ing it each load is cheap.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  return buildPageMetadata("tram", shareTokenFrom((await searchParams).s));
}

export default function Home() {
  return <VehicleStatus mode="tram" />;
}
