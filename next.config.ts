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
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return [{ source: "/:path*", headers: noFraming }];
  },
};

export default nextConfig;
