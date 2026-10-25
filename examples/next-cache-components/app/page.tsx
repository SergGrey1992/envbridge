import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getServerEnv } from "@serggrey1992/envbridge/server";
import View from "./view";
async function RuntimeValues() {
  await connection();
  // Log presence only: never put private values into HTML or props.
  process.stdout.write(
    `[envbridge] JWT_SECRET present: ${Boolean(getServerEnv("JWT_SECRET"))}\n`,
  );
  return <View />;
}
export default function Page() {
  return (
    <main>
      <h1>Static shell / runtime env</h1>
      <Link href="/other" prefetch>
        Other page
      </Link>
      <Suspense fallback={<p>Loading runtime values…</p>}>
        <RuntimeValues />
      </Suspense>
    </main>
  );
}
