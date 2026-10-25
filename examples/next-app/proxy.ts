import { createRuntimeEnvProxy } from "@serggrey1992/next-runtime-env/next";
import runtimeConfig from "./runtime.config";
export const proxy = createRuntimeEnvProxy(runtimeConfig);
export const config = { matcher: "/__runtime-env" };
