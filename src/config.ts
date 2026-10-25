export interface RuntimeConfig {
  public: readonly string[];
  server: readonly string[];
  output?: string;
  envFiles?: readonly string[];
}
export interface ResolvedRuntimeConfig extends RuntimeConfig {
  output: string;
  envFiles: readonly string[];
}
const forbidden = new Set(["__proto__", "constructor", "prototype"]);
export function defineRuntimeConfig(
  input: RuntimeConfig,
): ResolvedRuntimeConfig {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Runtime config must be an object");
  for (const key of Object.keys(input)) {
    if (!["public", "server", "output", "envFiles"].includes(key))
      throw new Error(`Unknown config option: ${key}`);
  }
  const seen = new Set<string>();
  for (const section of ["public", "server"] as const) {
    if (!Array.isArray(input[section]))
      throw new Error(`${section} must be an array`);
    for (const key of input[section]) {
      if (
        typeof key !== "string" ||
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ||
        forbidden.has(key)
      )
        throw new Error("Invalid environment variable name");
      if (seen.has(key)) throw new Error(`Duplicate environment key: ${key}`);
      seen.add(key);
    }
  }
  const output = input.output ?? "./runtime-env";
  if (typeof output !== "string" || !output.trim() || output.includes("\0"))
    throw new Error("Invalid output path");
  const envFiles = input.envFiles ?? [".env"];
  if (
    !Array.isArray(envFiles) ||
    envFiles.some(
      (f) =>
        typeof f !== "string" ||
        !/^\.env(?:\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)?$/.test(f),
    ) ||
    new Set(envFiles).size !== envFiles.length
  )
    throw new Error(
      "envFiles must contain unique .env or .env.<name> filenames",
    );
  return Object.freeze({
    public: Object.freeze([...input.public]),
    server: Object.freeze([...input.server]),
    output,
    envFiles: Object.freeze([...envFiles]),
  });
}
