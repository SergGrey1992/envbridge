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
