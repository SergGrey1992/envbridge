/** Parse declarations without ever reformatting or returning existing values. */
export function appendMissingEnv(
  content: string,
  keys: readonly string[],
): string {
  const lines = content.replace(/^\uFEFF/, "").split(/\r\n|\n/);
  const present = new Set<string>();
  let quote: string | undefined;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    let value: string;
    if (quote) value = line;
    else {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(
        line,
      );
      if (!match)
        throw new Error(`Invalid .env declaration at line ${index + 1}`);
      const key = match[1]!;
      if (present.has(key))
        throw new Error(`Duplicate .env declaration at line ${index + 1}`);
      present.add(key);
      value = match[2]!.trimStart();
      if (value[0] !== '"' && value[0] !== "'" && value[0] !== "`") continue;
      quote = value[0];
      value = value.slice(1);
    }
    let closed = false;
    for (let i = 0; i < value.length; i++) {
      if (quote === '"' && value[i] === "\\") {
        i++;
        continue;
      }
      if (value[i] === quote) {
        const rest = value.slice(i + 1).trim();
        if (rest && !rest.startsWith("#"))
          throw new Error(
            `Invalid quoted .env declaration at line ${index + 1}`,
          );
        closed = true;
        break;
      }
    }
    if (closed) quote = undefined;
  }
  if (quote) throw new Error("Unterminated quoted .env value");
  const missing = keys.filter((key) => !present.has(key));
  if (!missing.length) return content;
  const newline = content.match(/\r\n|\n/)?.[0] ?? "\n";
  const prefix =
    content.length && content !== "\ufeff"
      ? content.endsWith("\n")
        ? newline
        : newline + newline
      : "";
  return (
    content + prefix + missing.map((key) => `${key}=`).join(newline) + newline
  );
}
