import { connection } from "next/server";
import { createRuntimeEnvHandler } from "@serggrey1992/envbridge/runtime";
import config from "../../runtime.config";
const handle = createRuntimeEnvHandler(config);
export async function GET(request: Request) {
  await connection();
  return handle(request);
}
export const HEAD = GET;
