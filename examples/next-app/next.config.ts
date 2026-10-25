import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { cpus: 2 },
  outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
