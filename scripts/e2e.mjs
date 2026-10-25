import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { cp, readdir, readFile, writeFile, rm, rename } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import {
  prepareConsumer,
  consumerApp,
  consumerNext,
  buildArguments,
} from "./consumer.mjs";
const app = consumerApp;
prepareConsumer();
// Deployment supplies process env; generated empty .env entries are real empty strings.
for (const file of [
  ".env",
  ".env.development",
  ".env.test",
  ".env.staging",
  ".env.production",
])
  await rm(`${app}/${file}`, { force: true });
const builtEnv = {
  ...process.env,
  APP_NAME: "BUILD_VALUE",
  API_URL: "BUILD_API",
  NEXT_PUBLIC_TEST: "BUILD_PREFIX",
  JWT_SECRET: "BUILD_SECRET_CANARY",
};
execFileSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", ...buildArguments],
  { cwd: app, env: builtEnv, stdio: "inherit" },
);
await cp(`${app}/.next/static`, `${app}/.next/standalone/.next/static`, {
  recursive: true,
});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const reports = [];
async function scan(dir, needle) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await scan(p, needle);
    else if ((await readFile(p)).includes(needle))
      throw Error(`Secret found in ${p}`);
  }
}
async function run(mode, label, port) {
  const name = `${label} русский`;
  const api = `https://example.com/${label}?x=\"'<>&</script>\nстрока\u2028\u2029`;
  const secret = `RUNTIME_SECRET_${label}_CANARY`;
  const database = `postgresql://demo:DB_${label}_CANARY@localhost/runtime_demo`;
  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    APP_NAME: name,
    API_URL: api,
    NEXT_PUBLIC_TEST: `prefix-${label}`,
    JWT_SECRET: secret,
    DATABASE_URL: database,
  };
  delete env.MISSING;
  const server = spawn(
    process.execPath,
    mode === "standalone"
      ? [".next/standalone/server.js"]
      : ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    { cwd: app, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  server.stdout.on("data", (c) => (log += c));
  server.stderr.on("data", (c) => (log += c));
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw Error(log);
      try {
        if ((await fetch(`${base}/__runtime-env`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) throw Error("Server timeout " + log);
    const response = await fetch(`${base}/__runtime-env`);
    const payload = await response.text();
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert(!payload.includes(secret));
    assert(!payload.includes("JWT_SECRET"));
    assert(!payload.includes("</script>"));
    assert.equal(JSON.parse(payload).values.API_URL, api);
    const route = await (await fetch(`${base}/api/env`)).json();
    assert.deepEqual(route, {
      name,
      prefix: `prefix-${label}`,
      secretPresent: true,
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    const hydration = [];
    const browserMessages = [];
    page.on("console", (message) => browserMessages.push(message.text()));
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => {
      if (/hydrat|#418|#425/i.test(e.message)) hydration.push(e.message);
    });
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat|#418|#425/i.test(m.text()))
        hydration.push(m.text());
    });
    async function text(selector, expected) {
      try {
        await page.locator(selector).filter({ hasText: expected }).waitFor();
      } catch (error) {
        console.error("E2E state", {
          version: consumerNext,
          mode,
          label,
          selector,
          url: page.url(),
          body: await page.locator("body").innerText(),
          server: log,
        });
        throw error;
      }
      assert.equal(await page.locator(selector).textContent(), expected);
    }
    async function home() {
      await page.goto(base);
      await text("#client", name);
      await text("#server", name);
      await text("#prefix", `prefix-${label}`);
      await text("#api", api);
      await text("#absent", "undefined");
      await page.getByText("Hydrated", { exact: true }).click();
      assert.equal(
        await page.locator("html").getAttribute("data-hydrated"),
        "yes",
      );
    }
    await home();
    const publicTable = page.getByRole("table", {
      name: "Публичные runtime-переменные",
    });
    for (const key of ["API_URL", "APP_NAME", "NEXT_PUBLIC_TEST", "MISSING"])
      await publicTable.getByRole("row").filter({ hasText: key }).waitFor();
    assert(log.includes("[envbridge example] Server-only variables:"));
    assert(log.includes(secret));
    assert(log.includes(database));
    const html = await (await fetch(base)).text();
    assert(!html.includes(secret));
    assert(!html.includes(database));
    assert(!html.includes("BUILD_VALUE"));
    await page.getByText("Missing", { exact: true }).click();
    await text("#missing", name);
    await page.getByText("Home", { exact: true }).click();
    await text("#client", name);
    await page.goto(`${base}/missing`);
    await text("#missing", name);
    await page.reload();
    await text("#missing", name);
    await page.goto(`${base}/not-found-call`);
    await text("#missing", name);
    await home();
    await page.getByText("NotFound", { exact: true }).click();
    await text("#missing", name);
    await context.addCookies([{ name: "segment_fail", value: "1", url: base }]);
    await page.goto(`${base}/segment`);
    await text("#error", name);
    await page.reload();
    await text("#error", name);
    await page.getByText("Retry", { exact: true }).click();
    try {
      await text("#segment", name);
    } catch (error) {
      console.error(
        "RECOVERY DEBUG",
        await context.cookies(),
        await page.locator("body").innerText(),
        log,
      );
      throw error;
    }
    await home();
    await context.addCookies([{ name: "segment_fail", value: "1", url: base }]);
    await page.getByText("Segment", { exact: true }).click();
    await text("#error", name);
    await context.clearCookies();
    await page.getByText("Home", { exact: true }).click();
    await text("#client", name);
    await page.getByText("RootError", { exact: true }).click();
    await text("#global", name);
    await page.getByText("Recover", { exact: true }).click();
    await text("#client", name);
    await context.addCookies([{ name: "root_fail", value: "1", url: base }]);
    await page.goto(base);
    await text("#global", name);
    assert.equal(await page.locator("#envbridge").count(), 0);
    await page.reload();
    await text("#global", name);
    await page.getByText("Recover", { exact: true }).click();
    await text("#client", name);
    await page.goto(`${base}/stream`);
    await text("#stream", name);
    await text("#client", name);
    assert.deepEqual(hydration, []);
    assert(
      !browserMessages.some(
        (message) => message.includes(secret) || message.includes(database),
      ),
    );
    await scan(`${app}/.next/static`, Buffer.from(database));
    await scan(`${app}/.next/static`, Buffer.from(secret));
    await scan(`${app}/.next/static`, Buffer.from("BUILD_SECRET_CANARY"));
    await context.close();
    reports.push({ mode, environment: label, result: "PASS", checks: 19 });
    console.log(
      `E2E PASS ${mode} ${label}: SSR, client, hydration, navigation, 404, segment/global errors, recovery, streaming, injection, secret scan`,
    );
  } finally {
    server.kill();
    await once(server, "exit").catch(() => {});
  }
}
try {
  await run("production", "A", 3191);
  await run("production", "B", 3192);
  await run("standalone", "A", 3193);
  await run("standalone", "B", 3194);
} finally {
  await browser.close();
}
await rename(`${app}/.next`, `${app}/.next-positive`);
// Negative consumer build must fail because server-only is an actual Next compile guard.
const bad = `${app}/app/forbidden/page.tsx`;
await import("node:fs/promises").then((fs) =>
  fs.mkdir(`${app}/app/forbidden`, { recursive: true }),
);
await writeFile(
  bad,
  "'use client';\nimport { env } from '../../runtime-env/server';\nexport default function Page(){return <p>{env.JWT_SECRET}</p>;}\n",
);
try {
  let rejected = false;
  try {
    execFileSync(
      process.execPath,
      ["node_modules/next/dist/bin/next", ...buildArguments],
      { cwd: app, encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    assert.match(`${e.stdout}\n${e.stderr}`, /server-only|Server Component/);
    rejected = true;
  }
  assert(rejected, "Importing server API from a Client Component must fail");
  console.log("SERVER-ONLY NEGATIVE BUILD PASS");
} finally {
  await import("node:fs/promises").then((fs) =>
    fs.rm(`${app}/app/forbidden`, { recursive: true, force: true }),
  );
  await rm(`${app}/.next`, { recursive: true, force: true });
  await rename(`${app}/.next-positive`, `${app}/.next`);
}
await import("node:fs/promises").then((fs) =>
  fs.mkdir(new URL("../docs/compatibility", import.meta.url), {
    recursive: true,
  }),
);
await writeFile(
  new URL(
    process.env.NRE_NEXT_VERSION
      ? `../docs/compatibility/next-${consumerNext}.json`
      : "../docs/e2e-results.json",
    import.meta.url,
  ),
  JSON.stringify(
    {
      next: consumerNext,
      buildOnceRunTwice: true,
      runs: reports,
      serverOnlyNegativeBuild: "PASS",
    },
    null,
    2,
  ) + "\n",
);
