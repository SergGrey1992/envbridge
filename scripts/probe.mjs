import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "prototype", "-p", "3189"],
  { env: { ...process.env, APP_NAME: "runtime-probe" }, stdio: "inherit" },
);
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch("http://localhost:3189/runtime-env")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3189");
    await page
      .locator("#client")
      .filter({ hasText: "runtime-probe" })
      .waitFor();
    if ((await page.locator("#server").textContent()) !== "runtime-probe")
      throw Error("SSR");
    await page.getByText("missing", { exact: true }).click();
    await page
      .locator("#missing")
      .filter({ hasText: "runtime-probe" })
      .waitFor();
    await page.goto("http://localhost:3189/missing");
    await page
      .locator("#missing")
      .filter({ hasText: "runtime-probe" })
      .waitFor();
    await page.setExtraHTTPHeaders({ "x-root-error": "yes" });
    await page.goto("http://localhost:3189");
    await page
      .locator("#global")
      .filter({ hasText: "runtime-probe" })
      .waitFor();
    if (errors.some((e) => /hydrat|#418/i.test(e)))
      throw Error(errors.join("\n"));
    console.log(
      "PROTOTYPE PASS: runtime SSR, hydration, client/direct 404, direct root error without layout",
    );
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
