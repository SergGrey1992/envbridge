import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("../..", import.meta.url));
const manifest = join(root, "package.json");
const inCheckout =
  existsSync(join(root, "src/next.tsx")) &&
  existsSync(manifest) &&
  JSON.parse(readFileSync(manifest, "utf8")).name === "@serggrey1992/envbridge";

if (inCheckout) {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json"], {
      cwd: root,
      encoding: "utf8",
    }),
  )[0];
  const temporary = mkdtempSync(join(tmpdir(), "envbridge-example-"));
  try {
    // A unique path prevents npm reusing an older tarball with the same 0.1.0 filename.
    const archive = join(temporary, basename(packed.filename));
    cpSync(join(root, packed.filename), archive);
    rmSync(join(app, "node_modules/@serggrey1992/envbridge"), {
      recursive: true,
      force: true,
    });
    rmSync(join(app, "node_modules/.package-lock.json"), { force: true });
    execFileSync(
      "npm",
      [
        "install",
        "--no-save",
        "--package-lock=false",
        "--no-audit",
        "--no-fund",
        ...(process.env.NRE_OFFLINE ? ["--offline"] : []),
        archive,
      ],
      { cwd: app, stdio: "inherit" },
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  // Packed files can keep normalized mtimes; discard snapshots of the previous package.
  rmSync(join(app, ".next/cache"), { recursive: true, force: true });
  rmSync(join(app, "tsconfig.tsbuildinfo"), { force: true });
}

const require = createRequire(new URL("./package.json", import.meta.url));
const api = require("@serggrey1992/envbridge/next");
if (typeof api.createRuntimeEnvHandler !== "function") {
  throw new Error(
    "The example requires a current envbridge package with createRuntimeEnvHandler. Rebuild and reinstall the library tarball.",
  );
}
console.log("Example dependency ready: createRuntimeEnvHandler is available.");
