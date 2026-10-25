import "server-only";
export function getServerEnv(key: string): string | undefined {
  if (typeof window !== "undefined")
    throw new Error("Server environment API cannot execute in a browser");
  return process.env[key];
}
