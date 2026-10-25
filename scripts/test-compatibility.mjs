import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { compatibilityMatrix } from "./compatibility-matrix.mjs";
const entries = process.env.NRE_NEXT_VERSION
  ? compatibilityMatrix.filter((e) => e.next === process.env.NRE_NEXT_VERSION)
  : compatibilityMatrix;
if (!entries.length)
  throw new Error("Unknown Next.js compatibility test version");
for (const entry of entries) {
  rmSync(
    new URL(`../docs/compatibility/next-${entry.next}.json`, import.meta.url),
    { force: true },
  );
  console.log(`\nCompatibility: Next.js ${entry.next} / React ${entry.react}`);
  const result = spawnSync(process.execPath, ["scripts/e2e.mjs"], {
    stdio: "inherit",
    env: { ...process.env, NRE_NEXT_VERSION: entry.next },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
