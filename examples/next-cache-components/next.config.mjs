export default {
  cacheComponents: true,
  outputFileTracingRoot: process.cwd(),
  // Available in Next.js 16.4.3; omit on 16.2.9.
  partialPrefetching: true,
  experimental: { cpus: 2 },
};
