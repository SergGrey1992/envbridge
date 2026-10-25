import { inspect } from "node:util";
import { env } from "../runtime-env/client";
import { env as serverEnv } from "../runtime-env/server";
import View from "./view";

export default function Page() {
  // Direct Node stdout: Next dev replays console.* from Server Components in the browser.
  process.stdout.write(
    `[next-runtime-env example] Server-only variables:\n${inspect({ ...serverEnv }, { colors: false })}\n`,
  );

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "32px auto",
        padding: "0 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Next Runtime ENV — проверка значений</h1>
      <section>
        <h2>Публичное значение на сервере (SSR)</h2>
        <p>
          APP_NAME: <code id="server">{env.APP_NAME ?? "undefined"}</code>
          {env.APP_NAME === "" && <span> — пустая строка</span>}
        </p>
      </section>
      <View />
      <p>
        Серверные JWT_SECRET и DATABASE_URL выведены в терминал процесса Next.js
        с меткой <code>[next-runtime-env example] Server-only variables:</code>.
      </p>
    </main>
  );
}
