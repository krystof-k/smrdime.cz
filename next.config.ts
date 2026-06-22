import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // workers-og ships prebuilt .wasm (Satori/resvg) that Next's bundler can't
  // parse. Keep it external so the Cloudflare worker bundler links the WASM at
  // runtime instead. The OG route only runs on the worker, never in `next dev`.
  serverExternalPackages: ["workers-og"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
