import { createElement } from "react";
import type { RuntimeConfig } from "./config.js";
import { createRuntimeEnvHandler, createRuntimeEnvScript } from "./runtime.js";
export { serializePublicEnv, createRuntimeEnvHandler } from "./runtime.js";

/** Must render in a dynamically rendered root head, before hydration. */
export function RuntimeEnvScript({
  config,
  nonce,
}: {
  config: RuntimeConfig;
  nonce?: string;
}) {
  return createElement("script", {
    id: "envbridge",
    nonce,
    dangerouslySetInnerHTML: { __html: createRuntimeEnvScript(config) },
  });
}
/** Optional Next.js 16 Node proxy adapter; do not use in Edge middleware. */
export function createRuntimeEnvProxy(
  config: RuntimeConfig,
): (request: Request) => Response | undefined {
  const handler = createRuntimeEnvHandler(config);
  return (request) =>
    ["/runtime-env", "/__runtime-env"].includes(new URL(request.url).pathname)
      ? handler(request)
      : undefined;
}
