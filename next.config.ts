import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A parent directory has its own lockfile; pin the workspace root here.
  turbopack: { root: import.meta.dirname },
  // charon.js is served from /public and embedded cross-origin on creator sites.
  async headers() {
    return [
      {
        source: "/charon.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
      {
        // The gated content + pay endpoints are called from creator sites.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, payment-signature, PAYMENT-REQUIRED",
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
