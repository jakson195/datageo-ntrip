import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Large multipart uploads (no per-job total cap; per-file limit is 50 MB in API)
    proxyClientMaxBodySize: "10gb",
    serverActions: {
      bodySizeLimit: "10gb",
    },
  },
};

export default nextConfig;
