"use client";
import { env } from "../runtime-env/client";

const valueIds: Record<string, string> = {
  APP_NAME: "client",
  NEXT_PUBLIC_TEST: "prefix",
  API_URL: "api",
  MISSING: "absent",
};

export default function View() {
  return (
    <section>
      <h2>Публичные runtime-переменные</h2>
      <p>
        Значения из сгенерированного client env. Пустая строка и отсутствующая
        переменная отображаются отдельно.
      </p>
      <table
        aria-label="Публичные runtime-переменные"
        style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
      >
        <thead>
          <tr>
            <th style={{ padding: 12, borderBottom: "2px solid #888" }}>
              Переменная
            </th>
            <th style={{ padding: 12, borderBottom: "2px solid #888" }}>
              Значение
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(env).map(([name, value]) => (
            <tr key={name}>
              <th
                scope="row"
                style={{ padding: 12, borderBottom: "1px solid #ccc" }}
              >
                <code>{name}</code>
              </th>
              <td style={{ padding: 12, borderBottom: "1px solid #ccc" }}>
                <code
                  id={valueIds[name]}
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {value === undefined
                    ? "undefined"
                    : value === ""
                      ? '\"\" (пустая строка)'
                      : value}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        style={{ marginTop: 16, padding: "8px 16px" }}
        onClick={() => {
          document.documentElement.dataset.hydrated = "yes";
        }}
      >
        Hydrated
      </button>
    </section>
  );
}
