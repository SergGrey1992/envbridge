import { defineRuntimeConfig } from "@serggrey1992/next-runtime-env/config";
export default defineRuntimeConfig({
  public: ["APP_NAME", "API_URL", "VITE_API_URL", "EMPTY", "MISSING"],
  server: [],
});
