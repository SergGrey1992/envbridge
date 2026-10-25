export class RuntimeEnvNotInitializedError extends Error {
  constructor() {
    super(
      "Runtime environment is not initialized. Install RuntimeEnvScript and the runtime endpoint.",
    );
    this.name = "RuntimeEnvNotInitializedError";
  }
}
export class RuntimeEnvBootstrapError extends Error {
  constructor() {
    super(
      "Runtime environment bootstrap failed. Check the runtime endpoint, CSP, authentication and network.",
    );
    this.name = "RuntimeEnvBootstrapError";
  }
}
interface Snapshot {
  version: 1;
  values: Readonly<Record<string, string | null>>;
}
interface RuntimeWindow {
  __NEXT_RUNTIME_ENV__?: Snapshot;
  __NEXT_RUNTIME_ENV_FAILED__?: boolean;
}
function snapshot(value: unknown): Snapshot {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("values" in value) ||
    !value.values ||
    typeof value.values !== "object" ||
    Array.isArray(value.values)
  )
    throw new RuntimeEnvBootstrapError();
  const values: Record<string, string | null> = Object.create(null) as Record<
    string,
    string | null
  >;
  for (const [key, item] of Object.entries(value.values)) {
    if (typeof item !== "string" && item !== null)
      throw new RuntimeEnvBootstrapError();
    values[key] = item;
  }
  return Object.freeze({ version: 1, values: Object.freeze(values) });
}
/** Lazy on both server and browser; never evaluates environment at import time. */
export function getPublicEnv(key: string): string | undefined {
  if (typeof window === "undefined") return process.env[key];
  const state = window as unknown as RuntimeWindow;
  if (state.__NEXT_RUNTIME_ENV_FAILED__) throw new RuntimeEnvBootstrapError();
  if (!state.__NEXT_RUNTIME_ENV__) {
    if (typeof XMLHttpRequest === "undefined")
      throw new RuntimeEnvNotInitializedError();
    try {
      const endpoint = "/__runtime-env";
      const request = new XMLHttpRequest();
      request.open("GET", endpoint, false);
      request.send();
      if (request.status !== 200) throw new RuntimeEnvBootstrapError();
      state.__NEXT_RUNTIME_ENV__ = snapshot(
        JSON.parse(request.responseText) as unknown,
      );
    } catch {
      state.__NEXT_RUNTIME_ENV_FAILED__ = true;
      throw new RuntimeEnvBootstrapError();
    }
  }
  const values = state.__NEXT_RUNTIME_ENV__.values;
  return Object.hasOwn(values, key) ? (values[key] ?? undefined) : undefined;
}
