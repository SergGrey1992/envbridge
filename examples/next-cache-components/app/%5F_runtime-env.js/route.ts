import { connection } from "next/server";
import { createRuntimeEnvScript } from "@serggrey1992/envbridge/runtime";
import config from "../../runtime.config";

export async function GET() {
  await connection();
  return new Response(createRuntimeEnvScript(config), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
