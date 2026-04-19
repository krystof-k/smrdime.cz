import type { Metadata } from "next";
import { DebugClient } from "./debug-client";

export const metadata: Metadata = {
  title: "/debug",
  robots: { index: false, follow: false },
};

export default function DebugPage() {
  return <DebugClient />;
}
