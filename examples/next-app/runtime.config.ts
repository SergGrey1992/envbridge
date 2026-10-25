import { defineRuntimeConfig } from "@serggrey1992/envbridge/config";
export default defineRuntimeConfig({
  public: ["API_URL", "APP_NAME", "NEXT_PUBLIC_TEST", "MISSING"],
  server: ["JWT_SECRET", "DATABASE_URL"],
  envFiles: [
    ".env",
    ".env.development",
    ".env.test",
    ".env.staging",
    ".env.production",
  ],
});
