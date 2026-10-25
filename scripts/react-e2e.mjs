import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const template = fileURLToPath(
  new URL("../examples/react-vite", import.meta.url),
);
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--json"], { cwd: root, encoding: "utf8" }),
)[0];
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const reports = [];
async function fingerprint(dir) {
  const hashes = {};
  async function visit(current) {
    for (const item of await readdir(current, { withFileTypes: true })) {
      const path = `${current}/${item.name}`;
      if (item.isDirectory()) await visit(path);
      else if (item.name !== "runtime-env.js")
        hashes[path.slice(dir.length)] = createHash("sha256")
          .update(await readFile(path))
          .digest("hex");
    }
  }
  await visit(dir);
  return hashes;
}
async function scan(dir, needle) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await scan(path, needle);
    else
      assert(
        !(await readFile(path)).includes(needle),
        `Unexpected value in ${path}`,
      );
  }
}
async function start(app, dev = false) {
  const port = dev ? 3202 : 3201;
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      ...(dev ? [] : ["preview"]),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: app, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  server.stdout.on("data", (data) => (logs += data));
  server.stderr.on("data", (data) => (logs += data));
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw Error(logs);
      try {
        if ((await fetch(`${base}/runtime-env.js`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    assert(ready, "Vite startup timeout");
    return { server, base };
  } catch (error) {
    server.kill();
    throw error;
  }
}
async function stop(server) {
  if (server.exitCode === null) {
    server.kill();
    await once(server, "exit").catch(() => {});
  }
}
try {
  for (const react of ["18.2.0", "19.2.7"]) {
    const app = `${root}/.compat/react-${react}`;
    await mkdir(app, { recursive: true });
    for (const dir of ["src"]) {
      await rm(`${app}/${dir}`, { recursive: true, force: true });
      await cp(`${template}/${dir}`, `${app}/${dir}`, { recursive: true });
    }
    for (const file of [
      "index.html",
      "runtime.config.ts",
      "tsconfig.json",
      "vite.config.ts",
      "types.test.ts",
    ])
      await cp(`${template}/${file}`, `${app}/${file}`);
    const manifest = JSON.parse(
      await readFile(`${template}/package.json`, "utf8"),
    );
    manifest.dependencies.react = react;
    manifest.dependencies["react-dom"] = react;
    manifest.devDependencies["@types/react"] = react.startsWith("18.")
      ? "18.3.28"
      : "19.2.14";
    manifest.devDependencies["@types/react-dom"] = react.startsWith("18.")
      ? "18.3.7"
      : "19.2.3";
    await writeFile(
      `${app}/package.json`,
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await rm(`${app}/package-lock.json`, { force: true });
    await rm(`${app}/node_modules/.package-lock.json`, { force: true });
    await rm(`${app}/node_modules/@serggrey1992/envbridge`, {
      recursive: true,
      force: true,
    });
    execFileSync(
      "npm",
      [
        "install",
        ...(process.env.NRE_OFFLINE ? ["--offline"] : []),
        "--no-audit",
        "--no-fund",
      ],
      { cwd: app, stdio: "inherit" },
    );
    assert(
      !existsSync(`${app}/node_modules/next`),
      "Next.js must not be installed in the React consumer",
    );
    const listing = spawnSync("npm", ["ls", "next", "--all", "--json"], {
      cwd: app,
      encoding: "utf8",
    });
    assert([0, 1].includes(listing.status));
    const tree = JSON.parse(listing.stdout);
    assert(
      !tree.dependencies && !tree.error && !tree.problems,
      "React dependency tree must not contain Next.js",
    );
    const cli = (args, env = process.env) =>
      execFileSync(
        process.execPath,
        ["node_modules/@serggrey1992/envbridge/dist/cli.js", ...args],
        { cwd: app, env, stdio: "inherit" },
      );
    const buildEnv = {
      ...process.env,
      APP_NAME: "BUILD_REACT_CANARY",
      API_URL: "BUILD_API",
      VITE_API_URL: "BUILD_VITE_CANARY",
      PRIVATE_SECRET: "BUILD_PRIVATE_CANARY",
    };
    delete buildEnv.MISSING;
    cli(["generate", "--code-only"], buildEnv);
    execFileSync("npm", ["run", "build"], {
      cwd: app,
      env: buildEnv,
      stdio: "inherit",
    });
    const original = await fingerprint(`${app}/dist`);
    await scan(`${app}/dist/assets`, Buffer.from("BUILD_REACT_CANARY"));
    await scan(`${app}/dist/assets`, Buffer.from("BUILD_VITE_CANARY"));
    await scan(`${app}/dist`, Buffer.from("BUILD_PRIVATE_CANARY"));
    const { server, base } = await start(app);
    const contextA = await browser.newContext();
    let pageA;
    try {
      for (const label of ["A", "B"]) {
        const name = `React ${react} ${label} русский`;
        const api = `https://api.example.com/${label}?value=\"'<>&</script>\nстрока\u2028\u2029`;
        const env = {
          ...process.env,
          APP_NAME: name,
          API_URL: api,
          VITE_API_URL: `vite-${label}`,
          EMPTY: "",
          PRIVATE_SECRET: `PRIVATE_${label}_CANARY`,
        };
        delete env.MISSING;
        cli(["bootstrap", "--output", "dist/runtime-env.js"], env);
        assert.deepEqual(
          await fingerprint(`${app}/dist`),
          original,
          "Only bootstrap may change between environments",
        );
        const response = await fetch(`${base}/runtime-env.js`);
        assert.match(response.headers.get("cache-control"), /no-store/);
        const source = await response.text();
        assert(!source.includes("PRIVATE_"));
        assert(!source.includes("</script>"));
        if (pageA)
          assert.equal(
            await pageA.locator('[data-env="APP_NAME"]').textContent(),
            `React ${react} A русский`,
            "Existing document keeps its initialized snapshot",
          );
        const context = label === "A" ? contextA : await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base);
        await page
          .locator('[data-env="APP_NAME"]')
          .filter({ hasText: name })
          .waitFor();
        assert.equal(await page.locator("#first-read").textContent(), name);
        assert.equal(
          await page.locator('[data-env="API_URL"]').textContent(),
          api,
        );
        assert.equal(
          await page.locator('[data-env="VITE_API_URL"]').textContent(),
          `vite-${label}`,
        );
        assert.equal(
          await page.locator('[data-env="EMPTY"]').textContent(),
          '"" (пустая строка)',
        );
        assert.equal(
          await page.locator('[data-env="MISSING"]').textContent(),
          "undefined",
        );
        assert.equal(await page.evaluate(() => window.__INJECTED__), undefined);
        await page.getByText("Settings", { exact: true }).click();
        assert.equal(await page.locator("#route").textContent(), "/settings");
        assert.equal(
          await page.locator('[data-env="APP_NAME"]').textContent(),
          name,
        );
        await page.reload();
        await page
          .locator('[data-env="APP_NAME"]')
          .filter({ hasText: name })
          .waitFor();
        assert.deepEqual(errors, []);
        await page.getByText("Trigger error", { exact: true }).click();
        await page.locator("#error-value").filter({ hasText: name }).waitFor();
        await page.getByText("Recover", { exact: true }).click();
        await page
          .locator('[data-env="APP_NAME"]')
          .filter({ hasText: name })
          .waitFor();
        assert(!(await page.content()).includes(`PRIVATE_${label}_CANARY`));
        await scan(`${app}/dist`, Buffer.from(`PRIVATE_${label}_CANARY`));
        if (label === "A") pageA = page;
        else await context.close();
      }
      await pageA.reload();
      await pageA
        .locator('[data-env="APP_NAME"]')
        .filter({ hasText: `React ${react} B русский` })
        .waitFor();
    } finally {
      await contextA.close();
      await stop(server);
    }
    cli(["bootstrap"], {
      ...process.env,
      APP_NAME: "React dev",
      API_URL: "dev-url",
      VITE_API_URL: "dev-vite",
      EMPTY: "",
    });
    const dev = await start(app, true);
    try {
      const page = await browser.newPage();
      await page.goto(dev.base);
      await page
        .locator('[data-env="APP_NAME"]')
        .filter({ hasText: "React dev" })
        .waitFor();
      await page.close();
    } finally {
      await stop(dev.server);
    }
    reports.push({
      react,
      vite: "7.3.5",
      nextInstalled: false,
      tarball: packed.filename,
      strictTypes: "PASS",
      buildOnceRunTwice: "PASS",
      navigationAndErrorRecovery: "PASS",
      dev: "PASS",
      secretScan: "PASS",
    });
    console.log(
      `REACT PASS ${react}: no Next dependency, dev, production A/B, early synchronous read, navigation, reload, error recovery, secret scan, unchanged build assets`,
    );
  }
} finally {
  await browser.close();
}
await writeFile(
  new URL("../docs/react-results.json", import.meta.url),
  JSON.stringify({ runs: reports }, null, 2) + "\n",
);
