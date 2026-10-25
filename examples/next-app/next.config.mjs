/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { cpus: 2 },
  outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
