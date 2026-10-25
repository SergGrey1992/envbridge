import { defineRuntimeConfig } from "@serggrey1992/envbridge/config";
export default defineRuntimeConfig({
  public: ["APP_NAME", "API_URL"],
  server: ["JWT_SECRET"],
});
