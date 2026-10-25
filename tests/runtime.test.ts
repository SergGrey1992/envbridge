import { afterEach, describe, expect, it, vi } from "vitest";
import { defineRuntimeConfig } from "../src/config.js";
import {
  getPublicEnv,
  RuntimeEnvBootstrapError,
  RuntimeEnvNotInitializedError,
} from "../src/client.js";
import { serializePublicEnv, createRuntimeEnvProxy } from "../src/next.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("config", () => {
  it("defaults only paths and files, never values", () => {
    expect(
      defineRuntimeConfig({ public: ["API_URL"], server: ["SECRET"] }),
    ).toEqual({
      public: ["API_URL"],
      server: ["SECRET"],
      output: "./runtime-env",
      envFiles: [".env"],
    });
  });
  it.each([
    { public: ["A", "A"], server: [] },
    { public: ["A"], server: ["A"] },
    { public: ["__proto__"], server: [] },
    { public: ["constructor"], server: [] },
    { public: ["a-b"], server: [] },
    { public: ["A"], server: [], default: "x" },
    { public: ["A"], server: [], envFiles: ["../.env"] },
  ])("rejects unsafe structure %j", (c) =>
    expect(() => defineRuntimeConfig(c)).toThrow(),
  );
});
describe("runtime", () => {
  const config = defineRuntimeConfig({
    public: ["API_URL", "ABSENT", "NEXT_PUBLIC_TEST"],
    server: ["SECRET"],
  });
  it("reads dynamically on server including NEXT_PUBLIC prefix", () => {
    vi.stubEnv("NEXT_PUBLIC_TEST", "first");
    expect(getPublicEnv("NEXT_PUBLIC_TEST")).toBe("first");
    vi.stubEnv("NEXT_PUBLIC_TEST", "second");
    expect(getPublicEnv("NEXT_PUBLIC_TEST")).toBe("second");
  });
  it("serializes only public strings and safely embeds script terminators", () => {
    vi.stubEnv("API_URL", "\"'<> & </script>\nтест\u2028\u2029");
    vi.stubEnv("SECRET", "secret-canary");
    const json = serializePublicEnv(config);
    expect(json).not.toContain("<");
    expect(json).not.toContain("secret-canary");
    expect(JSON.parse(json)).toEqual({
      API_URL: process.env.API_URL,
      ABSENT: null,
      NEXT_PUBLIC_TEST: null,
    });
  });
  it("distinguishes missing initialized variables from missing bootstrap", () => {
    vi.stubGlobal("window", {
      __NEXT_RUNTIME_ENV__: {
        version: 1,
        values: { API_URL: "yes", ABSENT: null },
      },
    });
    expect(getPublicEnv("API_URL")).toBe("yes");
    expect(getPublicEnv("ABSENT")).toBeUndefined();
    expect(getPublicEnv("SECRET")).toBeUndefined();
    vi.stubGlobal("window", {});
    vi.stubGlobal("XMLHttpRequest", undefined);
    expect(() => getPublicEnv("API_URL")).toThrow(
      RuntimeEnvNotInitializedError,
    );
  });
  it("diagnoses failed endpoint without returning undefined", () => {
    vi.stubGlobal("window", {});
    class FailedXHR {
      status = 500;
      open() {}
      send() {}
    }
    vi.stubGlobal("XMLHttpRequest", FailedXHR);
    expect(() => getPublicEnv("API_URL")).toThrow(RuntimeEnvBootstrapError);
    expect(() => getPublicEnv("API_URL")).toThrow(RuntimeEnvBootstrapError);
  });
  it("validates fetched payload and prevents prototype reads", () => {
    vi.stubGlobal("window", {});
    class XHR {
      status = 200;
      responseText = JSON.stringify({
        version: 1,
        values: { API_URL: "loaded", ABSENT: null },
      });
      open() {}
      send() {}
    }
    vi.stubGlobal("XMLHttpRequest", XHR);
    expect(getPublicEnv("API_URL")).toBe("loaded");
    expect(getPublicEnv("constructor")).toBeUndefined();
  });
  it("proxy serves whitelist JSON with no caching, no CORS and method checks", async () => {
    vi.stubEnv("API_URL", "runtime");
    vi.stubEnv("SECRET", "secret-canary");
    const proxy = createRuntimeEnvProxy(config);
    const response = proxy(new Request("http://localhost/__runtime-env"))!;
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toContain("secret-canary");
    expect(proxy(new Request("http://localhost/other"))).toBeUndefined();
    expect(
      proxy(new Request("http://localhost/__runtime-env", { method: "POST" }))
        ?.status,
    ).toBe(405);
  });
});

it.each([
  "not-json",
  JSON.stringify({ version: 2, values: {} }),
  JSON.stringify({ version: 1, values: { KEY: 42 } }),
  JSON.stringify({ version: 1, values: [] }),
])("diagnoses malformed bootstrap payload", (payload) => {
  vi.stubGlobal("window", {});
  class InvalidXHR {
    status = 200;
    responseText = payload;
    open() {}
    send() {}
  }
  vi.stubGlobal("XMLHttpRequest", InvalidXHR);
  expect(() => getPublicEnv("API_URL")).toThrow(RuntimeEnvBootstrapError);
});
it("preserves initialized empty strings", () => {
  vi.stubGlobal("window", {
    __NEXT_RUNTIME_ENV__: { version: 1, values: { EMPTY: "" } },
  });
  expect(getPublicEnv("EMPTY")).toBe("");
});
