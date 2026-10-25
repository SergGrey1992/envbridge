#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { createJiti } from "jiti";
import { generate } from "./generator.js";
import { defineRuntimeConfig, type RuntimeConfig } from "./config.js";
const help = `next-runtime-env generate [options]
  --cwd <path>           Project root (default: process cwd)
  --config <path>        Config path relative to project root
  --env <names>          Select configured files: production,staging; default = .env
  --env-only            Only append missing .env keys
  --code-only           Only generate TypeScript getters
  --allow-outside-root  Explicitly permit output outside project root (no symlinks)
  --help                Show help
Output and envFiles are relative to --cwd, independent of config location.
`;
try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      cwd: { type: "string" },
      config: { type: "string" },
      env: { type: "string" },
      "env-only": { type: "boolean" },
      "code-only": { type: "boolean" },
      "allow-outside-root": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(help);
  } else {
    if (positionals.length !== 1 || positionals[0] !== "generate")
      throw new Error("Expected generate. Use --help.");
    if (values["env-only"] && values["code-only"])
      throw new Error("--env-only and --code-only cannot be combined");
    if (
      values.env !== undefined &&
      (!values.env || values.env.split(",").some((value) => !value.trim()))
    )
      throw new Error("--env requires nonempty comma-separated names");
    const cwd = resolve(values.cwd ?? process.cwd());
    const configPath = resolve(cwd, values.config ?? "runtime.config.ts");
    let loaded: unknown;
    try {
      loaded = await createJiti(import.meta.url, { moduleCache: false }).import(
        configPath,
        { default: true },
      );
    } catch {
      throw new Error(
        `Cannot load runtime config: ${configPath}. Check syntax, imports and file permissions. Config code executes as trusted Node.js code.`,
      );
    }
    const config = defineRuntimeConfig(loaded as RuntimeConfig);
    const changed = await generate(config, {
      cwd,
      envOnly: values["env-only"] ?? false,
      codeOnly: values["code-only"] ?? false,
      allowOutsideRoot: values["allow-outside-root"] ?? false,
      ...(values.env
        ? { env: values.env.split(",").map((value) => value.trim()) }
        : {}),
    });
    console.log(
      `Runtime environment: ${changed.length} file(s) updated. No values logged.`,
    );
    if (config.server.length && !values["code-only"])
      console.warn(
        "Warning: .env files may contain secrets. Exclude them from Git and review tracked files. .gitignore was not modified.",
      );
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Runtime environment generation failed",
  );
  process.exitCode = 1;
}
