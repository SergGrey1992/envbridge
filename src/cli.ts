#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { createJiti } from "jiti";
import { generate } from "./generator.js";
import { writeBootstrap } from "./bootstrap.js";
import { defineRuntimeConfig, type RuntimeConfig } from "./config.js";
const help = `envbridge generate [options]
envbridge bootstrap [options]
  --cwd <path>           Project root (default: process cwd)
  --config <path>        Config path relative to project root
  --env <names>          Generate: configured envFiles selection; default = .env
  --env-only             Generate: only append missing .env keys
  --code-only            Generate: only TypeScript getters
  --output <file.js>     Bootstrap: JS output (default: ./public/runtime-env.js)
  --dotenv <path>        Bootstrap: explicitly load this env file; process env wins
  --allow-outside-root   Explicitly permit output outside project root (no symlinks)
  --help                Show help
All relative paths use --cwd, independent of config location.
Generate never writes actual runtime values. Bootstrap writes PUBLIC values only.
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
      output: { type: "string" },
      dotenv: { type: "string" },
      "allow-outside-root": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) console.log(help);
  else {
    const command = positionals[0];
    if (
      positionals.length !== 1 ||
      !["generate", "bootstrap"].includes(command ?? "")
    )
      throw new Error("Expected generate or bootstrap. Use --help.");
    if (
      command === "generate" &&
      (values.output !== undefined || values["dotenv"] !== undefined)
    )
      throw new Error("--output and --dotenv apply only to bootstrap");
    if (
      command === "bootstrap" &&
      (values.env !== undefined ||
        values["env-only"] !== undefined ||
        values["code-only"] !== undefined)
    )
      throw new Error(
        "--env, --env-only and --code-only apply only to generate",
      );
    if (values["env-only"] && values["code-only"])
      throw new Error("--env-only and --code-only cannot be combined");
    if (
      values.env !== undefined &&
      (!values.env || values.env.split(",").some((v) => !v.trim()))
    )
      throw new Error("--env requires nonempty comma-separated names");
    const cwd = resolve(values.cwd ?? process.cwd());
    if (values["dotenv"] !== undefined) {
      if (!values["dotenv"].trim()) throw new Error("--dotenv requires a path");
      try {
        process.loadEnvFile(resolve(cwd, values["dotenv"]));
      } catch {
        throw new Error(
          "Cannot load the requested env file; check its path and permissions.",
        );
      }
    }
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
    if (command === "bootstrap") {
      if (values.output !== undefined && !values.output.trim())
        throw new Error("--output requires a .js path");
      const target = await writeBootstrap(config, {
        cwd,
        allowOutsideRoot: values["allow-outside-root"] ?? false,
        ...(values.output !== undefined ? { output: values.output } : {}),
      });
      console.log(
        `Public runtime bootstrap ready: ${target}. No values logged.`,
      );
    } else {
      const changed = await generate(config, {
        cwd,
        envOnly: values["env-only"] ?? false,
        codeOnly: values["code-only"] ?? false,
        allowOutsideRoot: values["allow-outside-root"] ?? false,
        ...(values.env
          ? { env: values.env.split(",").map((v) => v.trim()) }
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
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Runtime environment generation failed",
  );
  process.exitCode = 1;
}
