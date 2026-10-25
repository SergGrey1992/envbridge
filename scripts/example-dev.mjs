import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
process.env.NRE_NEXT_VERSION ??= "16.2.9";
const { consumerApp: app, prepareConsumer } = await import("./consumer.mjs");
prepareConsumer();
const secret = "DEMO_DEV_SERVER_SECRET_CANARY";
const database = "postgresql://demo:DEV_DATABASE_CANARY@localhost/demo";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", "3198"],
  {
    cwd: app,
    env: {
      ...process.env,
      APP_NAME: "Demo development",
      API_URL: "https://dev.example.com",
      NEXT_PUBLIC_TEST: "development",
      JWT_SECRET: secret,
      DATABASE_URL: database,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (c) => (logs += c));
server.stderr.on("data", (c) => (logs += c));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw Error("Dev server exited");
    try {
      if ((await fetch("http://localhost:3198/runtime-env")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(ready);
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage();
  const messages = [];
  page.on("console", (m) => messages.push(m.text()));
  await page.goto("http://localhost:3198");
  await page
    .getByRole("table", { name: "Публичные runtime-переменные" })
    .waitFor();
  await page.getByText("Hydrated", { exact: true }).click();
  assert(
    logs.includes(secret) && logs.includes(database),
    "Server logs must contain both server values",
  );
  const html = await page.content();
  assert(
    !html.includes(secret) && !html.includes(database),
    "Server values must not appear in HTML/RSC",
  );
  assert(
    !messages.some((m) => m.includes(secret) || m.includes(database)),
    "Server values must not be replayed into browser console",
  );
  console.log(
    "DEV DEMO PASS: public table, server-only logs, no secret in HTML/RSC/browser console",
  );
} finally {
  if (browser) await browser.close();
  server.kill();
  await once(server, "exit").catch(() => {});
}
