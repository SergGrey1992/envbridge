import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const app = fileURLToPath(new URL("../examples/next-app", import.meta.url));
export function prepareConsumer() {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json"], { cwd: root, encoding: "utf8" }),
  )[0];
  for (const file of packed.files) {
    if (!/^(dist\/|docs\/|README|LICENSE|package.json)/.test(file.path))
      throw new Error(`Unexpected packed path: ${file.path}`);
  }
  rmSync(`${app}/.next`, { recursive: true, force: true });
  rmSync(`${app}/tsconfig.tsbuildinfo`, { force: true });
  rmSync(`${app}/package-lock.json`, { force: true });
  rmSync(`${app}/node_modules/.package-lock.json`, { force: true });
  rmSync(`${app}/node_modules/@serggrey1992/next-runtime-env`, {
    recursive: true,
    force: true,
  });
  execFileSync(
    "npm",
    [
      "install",
      ...(process.env.NRE_OFFLINE ? ["--offline"] : []),
      "--no-audit",
      "--no-fund",
    ],
    { cwd: app, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    ["node_modules/@serggrey1992/next-runtime-env/dist/cli.js", "generate"],
    { cwd: app, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    ["node_modules/@serggrey1992/next-runtime-env/dist/cli.js", "--help"],
    { cwd: app, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "--noEmit"],
    { cwd: app, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      "-e",
      "require('@serggrey1992/next-runtime-env/next'); require('@serggrey1992/next-runtime-env/config');",
    ],
    { cwd: app, stdio: "inherit" },
  );
  execFileSync(
    "npm",
    ["exec", "--offline", "--", "next-runtime-env", "generate", "--code-only"],
    { cwd: app, stdio: "inherit" },
  );
  const manifest = JSON.parse(
    readFileSync(
      `${app}/node_modules/@serggrey1992/next-runtime-env/package.json`,
    ),
  );
  if (manifest.name !== "@serggrey1992/next-runtime-env")
    throw new Error("Wrong consumer package");
  console.log(
    `CONSUMER PASS: ${packed.filename}, ${packed.files.length} files, strict generated types`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) prepareConsumer();
