import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  symlink,
  rm,
  stat,
  link,
  chmod,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generate } from "../src/generator.js";
import { appendMissingEnv } from "../src/dotenv.js";
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "runtime-env-test-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
const config = {
  public: ["API_URL", "APP_NAME"],
  server: ["SECRET"],
  envFiles: [".env", ".env.production"],
};
describe("dotenv bytes", () => {
  it.each([
    'API_URL="https://example.com"',
    "API_URL=",
    "export API_URL=https://example.com",
    " API_URL = 'https://example.com' # comment",
  ])("preserves %s", (line) => {
    const original = `# comment\n${line}\nOTHER=hello`;
    const result = appendMissingEnv(original, ["API_URL", "OTHER", "MISSING"]);
    expect(result).toBe(`${original}\n\nMISSING=\n`);
    expect(appendMissingEnv(result, ["API_URL", "OTHER", "MISSING"])).toBe(
      result,
    );
  });
  it("preserves BOM and CRLF and multiline quoted values", () => {
    const original =
      '\ufeffAPI_URL="one\r\nAPP_NAME=inside value\r\nthree"\r\nSECRET=existing\r\n';
    expect(appendMissingEnv(original, ["API_URL", "SECRET", "APP_NAME"])).toBe(
      original + "\r\nAPP_NAME=\r\n",
    );
  });
  it.each([
    "BAD declaration",
    'KEY="unterminated',
    'KEY="ok" junk',
    "KEY=x\nKEY=y",
  ])("diagnoses malformed syntax without leaking values", (input) => {
    expect(() => appendMissingEnv(input, ["NEW"])).toThrow(/line|Unterminated/);
  });
});
describe("generator", () => {
  it("creates only names, preserves secrets and is byte/mtime idempotent", async () => {
    await writeFile(
      join(root, ".env"),
      "API_URL=existing\nSECRET=secret-canary",
    );
    await generate(config, { cwd: root });
    const client = await readFile(join(root, "runtime-env/client.ts"), "utf8");
    expect(client).toContain("get API_URL(): string | undefined");
    expect(client).not.toContain("SECRET");
    expect(client).not.toContain("secret-canary");
    expect(await readFile(join(root, ".env"), "utf8")).toBe(
      "API_URL=existing\nSECRET=secret-canary\n\nAPP_NAME=\n",
    );
    const before = await stat(join(root, ".env"));
    await generate(config, { cwd: root });
    expect((await stat(join(root, ".env"))).mtimeMs).toBe(before.mtimeMs);
  });
  it("refuses user code before making any writes", async () => {
    await mkdir(join(root, "runtime-env"));
    await writeFile(join(root, "runtime-env/server.ts"), "// user code");
    await expect(generate(config, { cwd: root })).rejects.toThrow(/overwrite/);
    await expect(stat(join(root, ".env"))).rejects.toThrow();
  });
  it("preflights malformed env files before writing code", async () => {
    await writeFile(join(root, ".env.production"), 'SECRET="oops');
    await expect(generate(config, { cwd: root })).rejects.toThrow();
    await expect(stat(join(root, "runtime-env/client.ts"))).rejects.toThrow();
    expect(await readFile(join(root, ".env.production"), "utf8")).toBe(
      'SECRET="oops',
    );
  });
  it("rejects escapes and symlinks", async () => {
    await expect(
      generate({ ...config, output: "../outside" }, { cwd: root }),
    ).rejects.toThrow(/outside/);
    await mkdir(join(root, "real"));
    await symlink(join(root, "real"), join(root, "linked"));
    await expect(
      generate({ ...config, output: "linked" }, { cwd: root }),
    ).rejects.toThrow(/symlink/);
    await symlink(join(root, "absent"), join(root, ".env"));
    await expect(generate(config, { cwd: root })).rejects.toThrow(/symlink/);
  });
  it("supports env selection, modes and custom output", async () => {
    await generate(
      { ...config, output: "src/runtime" },
      { cwd: root, codeOnly: true },
    );
    await expect(stat(join(root, ".env"))).rejects.toThrow();
    expect(
      await readFile(join(root, "src/runtime/server.ts"), "utf8"),
    ).toContain("import 'server-only'");
    await generate(config, { cwd: root, envOnly: true, env: ["production"] });
    await expect(stat(join(root, ".env"))).rejects.toThrow();
    expect(await readFile(join(root, ".env.production"), "utf8")).toContain(
      "SECRET=",
    );
    await expect(
      generate(config, { cwd: root, env: ["staging"] }),
    ).rejects.toThrow(/configured/);
    await expect(
      generate(config, { cwd: root, envOnly: true, codeOnly: true }),
    ).rejects.toThrow();
  });
});

it("rejects hardlinked env files without touching the other name", async () => {
  await writeFile(join(root, "private-original"), "SECRET=keep");
  await link(join(root, "private-original"), join(root, ".env"));
  await expect(generate(config, { cwd: root })).rejects.toThrow(/hardlink/);
  expect(await readFile(join(root, "private-original"), "utf8")).toBe(
    "SECRET=keep",
  );
});
it("rolls back generated code and earlier env appends on a real write failure", async () => {
  await writeFile(join(root, ".env"), "SECRET=keep");
  await writeFile(join(root, ".env.production"), "SECRET=keep-too");
  await chmod(join(root, ".env.production"), 0o400);
  await expect(generate(config, { cwd: root })).rejects.toThrow();
  expect(await readFile(join(root, ".env"), "utf8")).toBe("SECRET=keep");
  expect(await readFile(join(root, ".env.production"), "utf8")).toBe(
    "SECRET=keep-too",
  );
  await expect(stat(join(root, "runtime-env/client.ts"))).rejects.toThrow();
  await chmod(join(root, ".env.production"), 0o600);
});

it("restores readonly generated modules after a later env append fails", async () => {
  await generate(config, { cwd: root });
  const client = join(root, "runtime-env/client.ts");
  const server = join(root, "runtime-env/server.ts");
  const originalClient = await readFile(client);
  const originalServer = await readFile(server);
  await chmod(client, 0o400);
  await chmod(server, 0o400);
  await chmod(join(root, ".env.production"), 0o400);
  await expect(
    generate({ ...config, public: [...config.public, "NEW"] }, { cwd: root }),
  ).rejects.toThrow();
  expect(await readFile(client)).toEqual(originalClient);
  expect(await readFile(server)).toEqual(originalServer);
  expect((await stat(client)).mode & 0o777).toBe(0o400);
  expect(await readFile(join(root, ".env"), "utf8")).not.toContain("NEW=");
  await chmod(join(root, ".env.production"), 0o600);
});
it("does not mistake multiline backtick content for declarations", () => {
  const content = "OTHER=`hello\nAPP_NAME=inside`\n";
  expect(appendMissingEnv(content, ["APP_NAME"])).toBe(
    content + "\nAPP_NAME=\n",
  );
});
