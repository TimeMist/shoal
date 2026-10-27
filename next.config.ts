import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Turbopack's production build ran past Render's 8 GB build limit, so `npm run build` uses webpack.
  experimental: { cpus: 2 },
  enablePrerenderSourceMaps: false,
};

export default nextConfig;
