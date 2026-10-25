import { createRuntimeEnvHandler } from "@serggrey1992/envbridge/next";
import runtimeConfig from "../../runtime.config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createRuntimeEnvHandler(runtimeConfig);
export const HEAD = GET;
