import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  outputFileTracingExcludes: { "*": ["node_modules/sharp/**", "node_modules/@img/**"] },
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const noFraming = [
      // frame-src 'none' keeps a scene from navigating its sandboxed frame to a web page: CSP fetch rules
      // inside the scene don't cover navigation. Scenes load through srcdoc, which frame-src doesn't block.
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; frame-src 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return [{ source: "/:path*", headers: noFraming }];
  },
};

export default nextConfig;
