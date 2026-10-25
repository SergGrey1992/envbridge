import type { NextConfig } from "next";
import { withRuntimeEnv } from "@serggrey1992/next-runtime-env/next";
import runtimeConfig from "./runtime.config";
const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { cpus: 2 },
  outputFileTracingRoot: process.cwd(),
};
export default withRuntimeEnv(nextConfig, runtimeConfig);
