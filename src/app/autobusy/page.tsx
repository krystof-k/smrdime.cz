import VehicleStatus from "@/components/VehicleStatus";
import { buildPageMetadata } from "@/lib/page-metadata";

// Rendered per request so generateMetadata's og:image cache-bust bucket stays
// current. The page is a thin client shell, so SSR-ing it each load is cheap.
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildPageMetadata("bus");
}

export default function Buses() {
  return <VehicleStatus mode="bus" />;
}
