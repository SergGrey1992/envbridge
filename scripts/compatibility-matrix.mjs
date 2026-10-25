export const compatibilityMatrix = [
  { next: "13.5.11", react: "18.2.0", types: "18.3.28" },
  { next: "14.2.35", react: "18.3.1", types: "18.3.28" },
  { next: "15.5.28", react: "19.2.7", types: "19.2.14" },
  { next: "16.2.9", react: "19.2.7", types: "19.2.14" },
  { next: "16.4.3", react: "19.2.7", types: "19.2.14" },
];
export function selectedCompatibility() {
  const version = process.env.NRE_NEXT_VERSION;
  if (!version) return undefined;
  const entry = compatibilityMatrix.find((entry) => entry.next === version);
  if (!entry)
    throw new Error(`Unsupported compatibility test version: ${version}`);
  return entry;
}
