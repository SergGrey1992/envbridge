import { env } from "../../../runtime-env/client";
import { env as serverEnv } from "../../../runtime-env/server";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      name: env.APP_NAME,
      prefix: env.NEXT_PUBLIC_TEST,
      secretPresent: Boolean(serverEnv.JWT_SECRET),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
