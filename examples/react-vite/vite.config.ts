import { defineConfig } from "vite";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  // Local preview only; configure the same no-store rule for runtime-env.js on your host.
  preview: { headers: { "Cache-Control": "no-store" } },
});
