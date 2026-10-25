import { createElement } from "react";
import { defineRuntimeConfig, type RuntimeConfig } from "./config.js";
const escapeJson = (value: unknown): string =>
  JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
export function serializePublicEnv(config: RuntimeConfig): string {
  const resolved = defineRuntimeConfig(config);
  const values: Record<string, string | null> = Object.create(null) as Record<
    string,
    string | null
  >;
  for (const key of resolved.public) values[key] = process.env[key] ?? null;
  return escapeJson(values);
}
/** Must render in a dynamically rendered root head, before hydration. */
export function RuntimeEnvScript({
  config,
  nonce,
}: {
  config: RuntimeConfig;
  nonce?: string;
}) {
  if (typeof window !== "undefined")
    throw new Error("RuntimeEnvScript must render on the server");
  const resolved = defineRuntimeConfig(config);
  const values = serializePublicEnv(resolved);
  const source = `window.__NEXT_RUNTIME_ENV__=Object.freeze({version:1,values:Object.freeze(${values})});`;
  return createElement("script", {
    id: "next-runtime-env",
    nonce,
    dangerouslySetInnerHTML: { __html: source },
  });
}
/** Node.js App Router endpoint. Mount at /__runtime-env with force-dynamic. */
export function createRuntimeEnvHandler(
  config: RuntimeConfig,
): (request: Request) => Response {
  const resolved = defineRuntimeConfig(config);
  return (request) => {
    const headers = {
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    };
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response(null, {
        status: 405,
        headers: { ...headers, Allow: "GET, HEAD" },
      });
    return new Response(
      request.method === "HEAD"
        ? null
        : `{"version":1,"values":${serializePublicEnv(resolved)}}`,
      { headers },
    );
  };
}
/** Optional Next.js 16 Node proxy adapter; do not use in Edge middleware. */
export function createRuntimeEnvProxy(
  config: RuntimeConfig,
): (request: Request) => Response | undefined {
  const handler = createRuntimeEnvHandler(config);
  return (request) =>
    new URL(request.url).pathname === "/__runtime-env"
      ? handler(request)
      : undefined;
}
