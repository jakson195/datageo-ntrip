import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
/**
 * Vercel injects NEXT_PRIVATE_OUTPUT_TRACE_ROOT (/vercel/path0).
 * turbopack.root must match exactly — never set it separately.
 */
const tracingRoot =
  process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT?.trim() || appDir;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: tracingRoot,
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
