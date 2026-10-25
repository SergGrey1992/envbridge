import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const prefix = process.env.NRE_DOCKER_CONFIG
  ? ["--config", process.env.NRE_DOCKER_CONFIG]
  : [];
function docker(args) {
  return execFileSync("docker", [...prefix, ...args], {
    encoding: "utf8",
  }).trim();
}
const image = "envbridge-example:local";
if (!process.env.NRE_DOCKER_SKIP_BUILD)
  execFileSync(
    "docker",
    [
      ...prefix,
      "build",
      "-f",
      "examples/next-app/Dockerfile",
      "-t",
      image,
      ".",
    ],
    { stdio: "inherit" },
  );
const imageId = docker(["image", "inspect", "--format", "{{.Id}}", image]);
const nodeVersion = docker(["run", "--rm", image, "node", "--version"]);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const results = [];
try {
  for (const [label, port] of [
    ["docker-A", 3195],
    ["docker-B", 3196],
  ]) {
    const name = `${label} русский`;
    const id = docker([
      "run",
      "--rm",
      "-d",
      "-p",
      `127.0.0.1:${port}:3000`,
      "-e",
      `APP_NAME=${name}`,
      "-e",
      `API_URL=https://${label}.example.com`,
      "-e",
      `NEXT_PUBLIC_TEST=${label}`,
      "-e",
      `JWT_SECRET=SECRET_${label}_CANARY`,
      image,
    ]);
    try {
      const base = `http://127.0.0.1:${port}`;
      let ready = false;
      for (let i = 0; i < 120; i++) {
        try {
          if ((await fetch(`${base}/runtime-env`)).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert(ready, "Docker server startup timeout");
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => {
        if (/hydration|#418|#425/i.test(e.message)) errors.push(e.message);
      });
      async function text(selector, value) {
        await page.locator(selector).filter({ hasText: value }).waitFor();
        assert.equal(await page.locator(selector).textContent(), value);
      }
      await page.goto(base);
      await text("#client", name);
      await text("#server", name);
      await text("#prefix", label);
      await page.getByText("Hydrated", { exact: true }).click();
      assert.equal(
        await page.locator("html").getAttribute("data-hydrated"),
        "yes",
      );
      await page.getByText("Missing", { exact: true }).click();
      await text("#missing", name);
      const data = await (await fetch(`${base}/api/env`)).json();
      assert.deepEqual(data, { name, prefix: label, secretPresent: true });
      const bootstrap = await (await fetch(`${base}/runtime-env`)).text();
      assert(!bootstrap.includes("SECRET_"));
      assert(!bootstrap.includes("JWT_SECRET"));
      await context.addCookies([{ name: "root_fail", value: "1", url: base }]);
      await page.goto(base);
      await text("#global", name);
      assert.equal(await page.locator("#envbridge").count(), 0);
      await page.getByText("Recover", { exact: true }).click();
      await text("#client", name);
      assert.deepEqual(errors, []);
      await context.close();
      results.push({ environment: label, image: imageId, result: "PASS" });
      console.log(
        `DOCKER PASS ${label}: one image, SSR, hydration, client, prefix, 404, global-error, recovery, server API, secret exclusion`,
      );
    } finally {
      docker(["stop", id]);
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  new URL("../docs/docker-results.json", import.meta.url),
  JSON.stringify({ image: imageId, nodeVersion, runs: results }, null, 2) +
    "\n",
);
