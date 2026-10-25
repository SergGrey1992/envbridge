import { spawn, execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { once } from "node:events";
import { chromium } from "@playwright/test";
const cwd = new URL("../examples/next-cache-components/", import.meta.url);
execFileSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
  {
    cwd,
    env: {
      ...process.env,
      APP_NAME: "BUILD_VALUE",
      API_URL: "https://build.invalid",
      JWT_SECRET: "BUILD_PRIVATE_CANARY",
    },
    stdio: "inherit",
  },
);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
try {
  for (const value of ["Runtime A", "Runtime B"]) {
    const server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "3215"],
      {
        cwd,
        env: {
          ...process.env,
          APP_NAME: value,
          API_URL: "https://runtime.example.com",
          JWT_SECRET: "PRIVATE_CANARY",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let logs = "";
    server.stdout.on("data", (x) => {
      logs += x;
    });
    server.stderr.on("data", (x) => {
      logs += x;
    });
    try {
      for (let n = 0; ; n++) {
        try {
          if ((await fetch("http://localhost:3215")).ok) break;
        } catch {}
        if (n === 100 || server.exitCode !== null) throw new Error(logs);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const response = await page.goto("http://localhost:3215");
      const html = await response.text();
      assert(!html.includes("BUILD_VALUE"));
      assert(!html.includes("PRIVATE_CANARY"));
      await page.waitForFunction(
        (v) => document.querySelector("#client")?.textContent === v,
        value,
      );
      await page.getByRole("button").click();
      await page
        .getByRole("button", { name: "Hydrated", exact: true })
        .waitFor();
      await page.getByRole("link", { name: "Other page" }).click();
      await page.waitForURL("**/other");
      assert.equal(await page.locator("#client:visible").textContent(), value);
      const snapshot = await fetch("http://localhost:3215/__runtime-env");
      assert.match(snapshot.headers.get("cache-control"), /no-store/);
      assert.equal((await snapshot.json()).values.APP_NAME, value);
      const script = await fetch("http://localhost:3215/__runtime-env.js");
      assert.match(script.headers.get("cache-control"), /no-store/);
      assert(!(await script.text()).includes("PRIVATE_CANARY"));
      assert.deepEqual(errors, []);
      assert(logs.includes("JWT_SECRET present: true"));
      await page.close();
      console.log(`PASS Cache Components + partial prefetch: ${value}`);
    } finally {
      server.kill("SIGTERM");
      if (server.exitCode === null) await once(server, "exit");
    }
  }
} finally {
  await browser.close();
}
