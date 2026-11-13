import type { NextConfig } from "next";

/**
 * Groundwork is a fully personalized, authenticated app backed by a local SQLite database,
 * so every page renders per request; Cache Components / Partial Prefetching are not used.
 */
const nextConfig: NextConfig = {
  // Lets a test build live next to a running dev server (e.g. NEXT_DIST_DIR=.next-test).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // proof-of-work uploads (max 15 MB per file, enforced again in the action)
      bodySizeLimit: "16mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
