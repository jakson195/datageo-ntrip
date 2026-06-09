import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Same as __dirname in next.config.js — pins root to this app (not monorepo parent). */
const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: rootDir,
  },
  async headers() {
    return [
      {
        source: "/api/coverage",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }],
      },
      {
        source: "/api/geocoding/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/processamento",
        destination: "/#contato",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
