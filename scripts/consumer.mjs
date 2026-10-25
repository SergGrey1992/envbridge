import { execFileSync } from "node:child_process";
import {
  readFileSync,
  rmSync,
  mkdirSync,
  cpSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
import { selectedCompatibility } from "./compatibility-matrix.mjs";
const example = fileURLToPath(new URL("../examples/next-app", import.meta.url));
const selected = selectedCompatibility();
export const consumerApp = selected
  ? `${root}/.compat/next-${selected.next}`
  : example;
const app = consumerApp;
export const consumerNext = selected?.next ?? "16.2.9";
export const buildArguments =
  Number(consumerNext.split(".")[0]) >= 16 ? ["build", "--webpack"] : ["build"];
export function prepareConsumer() {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json"], { cwd: root, encoding: "utf8" }),
  )[0];
  for (const file of packed.files) {
    if (!/^(dist\/|docs\/|README|LICENSE|package.json)/.test(file.path))
      throw new Error(`Unexpected packed path: ${file.path}`);
  }
  if (selected) {
    mkdirSync(app, { recursive: true });
    rmSync(`${app}/app`, { recursive: true, force: true });
    cpSync(`${example}/app`, `${app}/app`, { recursive: true });
    for (const file of [
      "runtime.config.ts",
      "next.config.mjs",
      "tsconfig.json",
      "types.test.ts",
    ])
      cpSync(`${example}/${file}`, `${app}/${file}`);
    const manifest = JSON.parse(readFileSync(`${example}/package.json`));
    const major = Number(selected.next.split(".")[0]);
    const tracing =
      major < 15
        ? "experimental: { cpus: 2, outputFileTracingRoot: process.cwd() }"
        : "experimental: { cpus: 2 }, outputFileTracingRoot: process.cwd()";
    writeFileSync(
      `${app}/next.config.mjs`,
      `export default { output: 'standalone', ${tracing} };\n`,
    );
    manifest.scripts.build = `next ${buildArguments.join(" ")}`;
    manifest.dependencies.next = selected.next;
    manifest.dependencies.react = selected.react;
    manifest.dependencies["react-dom"] = selected.react;
    manifest.devDependencies["@types/react"] = selected.types;
    manifest.devDependencies["@types/react-dom"] = selected.react.startsWith(
      "18.",
    )
      ? "18.3.7"
      : "19.2.3";
    writeFileSync(
      `${app}/package.json`,
      JSON.stringify(manifest, null, 2) + "\n",
    );
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
