import { cookies } from "next/headers";
import { env } from "../../runtime-env/client";
export default async function Page() {
  if ((await cookies()).get("segment_fail")?.value === "1")
    throw new Error("Intentional segment error");
  return <p id="segment">{env.APP_NAME}</p>;
}
