import { connection } from "next/server";
import { cookies } from "next/headers";
import { RuntimeEnvScript } from "@serggrey1992/next-runtime-env/next";
import config from "../runtime.config";
import Link from "next/link";
import Root from "./root";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  if ((await cookies()).get("root_fail")?.value === "1")
    throw new Error("Intentional root error");
  return (
    <html lang="en">
      <head>
        <RuntimeEnvScript config={config} />
      </head>
      <body>
        <Root>
          <nav>
            <Link href="/">Home</Link> <Link href="/missing">Missing</Link>{" "}
            <Link href="/not-found-call">NotFound</Link>{" "}
            <Link href="/segment">Segment</Link>{" "}
            <Link href="/client-root-error">RootError</Link>
          </nav>
          {children}
        </Root>
      </body>
    </html>
  );
}
