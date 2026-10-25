import { constants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { RuntimeConfig } from "./config.js";
import { createRuntimeEnvScript } from "./runtime.js";
import { checkPath, existing } from "./generator.js";
export const BOOTSTRAP_MARKER =
  "// AUTO-GENERATED RUNTIME BOOTSTRAP BY @serggrey1992/envbridge\n";
const LEGACY_BOOTSTRAP_MARKER =
  "// AUTO-GENERATED RUNTIME BOOTSTRAP BY @serggrey1992/next-runtime-env\n";
export interface BootstrapOptions {
  cwd: string;
  output?: string;
  allowOutsideRoot?: boolean;
}
/** Public values are written only by this explicit command, never by generate. */
export async function writeBootstrap(
  config: RuntimeConfig,
  options: BootstrapOptions,
): Promise<string> {
  const root = await realpath(resolve(options.cwd));
  const target = resolve(root, options.output ?? "./public/runtime-env.js");
  if (!target.endsWith(".js"))
    throw new Error("Bootstrap output must be a .js file");
  const allowOutside = options.allowOutsideRoot ?? false;
  await checkPath(target, root, allowOutside);
  const before = await existing(target);
  if (
    before &&
    ![BOOTSTRAP_MARKER, LEGACY_BOOTSTRAP_MARKER].some((marker) =>
      before.toString("utf8").startsWith(marker),
    )
  )
    throw new Error("Refusing to overwrite user bootstrap JavaScript");
  const source = Buffer.from(
    BOOTSTRAP_MARKER + createRuntimeEnvScript(config) + "\n",
  );
  if (before?.equals(source)) return target;
  await mkdir(dirname(target), { recursive: true });
  await checkPath(target, root, allowOutside);
  const temporary = `${target}.${randomUUID()}.tmp`;
  const mode = before ? (await lstat(target)).mode & 0o777 : 0o644;
  try {
    const file = await open(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      mode,
    );
    try {
      await file.writeFile(source);
      await file.sync();
    } finally {
      await file.close();
    }
    const current = await existing(target);
    if (before ? !current?.equals(before) : current !== undefined)
      throw new Error("Bootstrap destination changed during generation; retry");
    await checkPath(target, root, allowOutside);
    if (before) await rename(temporary, target);
    else await link(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return target;
}
