import { afterEach, beforeEach, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "runtime-cli-"));
  await mkdir(join(root, "configs"));
  await writeFile(
    join(root, "configs/runtime.config.ts"),
    "export default {public:['APP_NAME'],server:['SECRET'],output:'src/env',envFiles:['.env','.env.production','.env.staging']};",
  );
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
function cli(...args: string[]) {
  return spawnSync(process.execPath, [resolve("dist/cli.js"), ...args], {
    encoding: "utf8",
  });
}
it("loads TS config relative to --cwd and resolves output relative to project root", async () => {
  const result = cli(
    "generate",
    "--cwd",
    root,
    "--config",
    "configs/runtime.config.ts",
    "--code-only",
  );
  expect(result.status).toBe(0);
  expect(await readFile(join(root, "src/env/client.ts"), "utf8")).toContain(
    "get APP_NAME()",
  );
  await expect(stat(join(root, ".env"))).rejects.toThrow();
});
it("selects configured files with --env and --env-only", async () => {
  const result = cli(
    "generate",
    "--cwd",
    root,
    "--config",
    "configs/runtime.config.ts",
    "--env-only",
    "--env",
    "production,staging",
  );
  expect(result.status).toBe(0);
  expect(result.stderr).toContain("Git");
  expect(await readFile(join(root, ".env.production"), "utf8")).toBe(
    "APP_NAME=\nSECRET=\n",
  );
  await expect(stat(join(root, ".env"))).rejects.toThrow();
  await expect(stat(join(root, "src"))).rejects.toThrow();
});
it.each([
  ["--env-only", "--code-only"],
  ["--env", "unknown"],
  ["--env", ""],
  ["--env", "production,"],
  ["--unknown"],
])("rejects invalid options %j", (...flags) => {
  const result = cli(
    "generate",
    "--cwd",
    root,
    "--config",
    "configs/runtime.config.ts",
    ...flags,
  );
  expect(result.status).toBe(1);
});
it("help succeeds and load errors do not reveal thrown config secrets", async () => {
  expect(cli("--help").stdout).toContain("--cwd");
  await writeFile(
    join(root, "runtime.config.ts"),
    "throw new Error('DO_NOT_LOG_SECRET');",
  );
  const result = cli("generate", "--cwd", root);
  expect(result.status).toBe(1);
  expect(result.stderr).not.toContain("DO_NOT_LOG_SECRET");
});

it("bootstrap explicitly loads env file, preserves process precedence and never logs values", async () => {
  await writeFile(
    join(root, "runtime.config.ts"),
    "export default {public:['APP_NAME'],server:['SECRET']};",
  );
  await writeFile(
    join(root, ".env.staging"),
    "APP_NAME=file-public-canary\nSECRET=file-secret-canary\n",
  );
  const result = spawnSync(
    process.execPath,
    [
      resolve("dist/cli.js"),
      "bootstrap",
      "--cwd",
      root,
      "--dotenv",
      ".env.staging",
      "--output",
      "dist/runtime-env.js",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        APP_NAME: "shell-public-canary",
        SECRET: "shell-secret-canary",
      },
    },
  );
  expect(result.status).toBe(0);
  expect(result.stdout + result.stderr).not.toContain("shell-public-canary");
  expect(result.stdout + result.stderr).not.toContain("secret-canary");
  const output = await readFile(join(root, "dist/runtime-env.js"), "utf8");
  expect(output).toContain("shell-public-canary");
  expect(output).not.toContain("file-public-canary");
  expect(output).not.toContain("secret-canary");
  await expect(stat(join(root, "runtime-env/client.ts"))).rejects.toThrow();
});
it.each([
  ["bootstrap", "--env-only"],
  ["bootstrap", "--code-only"],
  ["bootstrap", "--env", "production"],
  ["generate", "--dotenv", ".env"],
  ["generate", "--output", "public/runtime-env.js"],
])("rejects command-specific options %j", (...args) => {
  const result = cli(...args, "--cwd", root);
  expect(result.status).toBe(1);
});
