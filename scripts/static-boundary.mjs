import { mkdtemp, writeFile, mkdir, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = await mkdtemp(join(tmpdir(), "next-runtime-env-static-"));
const consumer = fileURLToPath(
  new URL("../examples/next-app", import.meta.url),
);
let server;
try {
  await symlink(`${consumer}/node_modules`, join(root, "node_modules"), "dir");
  await mkdir(join(root, "app"));
  await writeFile(
    join(root, "package.json"),
    '{"name":"static-boundary-fixture","private":true,"type":"module"}',
  );
  await writeFile(
    join(root, "next.config.mjs"),
    `export default {experimental:{cpus:2},outputFileTracingRoot:${JSON.stringify(root)}};`,
  );
  await writeFile(
    join(root, "app/layout.tsx"),
    "export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>;}",
  );
  await writeFile(
    join(root, "app/page.tsx"),
    "import { getPublicEnv } from '@serggrey1992/next-runtime-env/client';\nexport const dynamic='force-static';\nexport default function Page(){return <p>{getPublicEnv('APP_NAME')}</p>;}",
  );
  execFileSync(
    process.execPath,
    [`${consumer}/node_modules/next/dist/bin/next`, "build", "--webpack"],
    {
      cwd: root,
      env: { ...process.env, APP_NAME: "STATIC_BUILD_VALUE" },
      stdio: "inherit",
    },
  );
  server = spawn(
    process.execPath,
    [`${consumer}/node_modules/next/dist/bin/next`, "start", "-p", "3197"],
    {
      cwd: root,
      env: { ...process.env, APP_NAME: "RUNTIME_DIFFERENT" },
      stdio: "ignore",
    },
  );
  let html;
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch("http://127.0.0.1:3197");
      if (response.ok) {
        html = await response.text();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(html?.includes("STATIC_BUILD_VALUE"));
  assert(!html.includes("RUNTIME_DIFFERENT"));
  console.log(
    "STATIC BOUNDARY PASS: static HTML intentionally retains build-time value; dynamic rendering is mandatory for runtime SSR",
  );
} finally {
  if (server) {
    server.kill();
    await once(server, "exit").catch(() => {});
  }
  await rm(root, { recursive: true, force: true });
}
