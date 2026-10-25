import { cookies } from "next/headers";
import { RuntimeEnvScript } from "@serggrey1992/envbridge/next";
import config from "../runtime.config";
import Link from "next/link";
import Root from "./root";
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <Link prefetch={false} href="/">
              Home
            </Link>{" "}
            <Link prefetch={false} href="/missing">
              Missing
            </Link>{" "}
            <Link prefetch={false} href="/not-found-call">
              NotFound
            </Link>{" "}
            <Link prefetch={false} href="/segment">
              Segment
            </Link>{" "}
            <Link prefetch={false} href="/client-root-error">
              RootError
            </Link>
          </nav>
          {children}
        </Root>
      </body>
    </html>
  );
}
