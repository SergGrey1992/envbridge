import { Component, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { env } from "../runtime-env/client";

// Explicit early read demonstrates bootstrap is already ready before the first render.
const firstRead = env.APP_NAME;

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section>
        <p id="error-value">{env.APP_NAME}</p>
        <button onClick={() => this.setState({ failed: false })}>
          Recover
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [fail, setFail] = useState(false);
  if (fail) throw new Error("Intentional React example error");
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "32px auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>React Runtime ENV</h1>
      <p>
        Первое чтение: <code id="first-read">{firstRead}</code>
      </p>
      <p>
        Маршрут: <code id="route">{route}</code>
      </p>
      <button
        onClick={() => {
          window.history.pushState({}, "", "/settings");
          setRoute("/settings");
        }}
      >
        Settings
      </button>
      <button onClick={() => setFail(true)}>Trigger error</button>
      <table aria-label="Публичные runtime-переменные">
        <thead>
          <tr>
            <th>Переменная</th>
            <th>Значение</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(env).map(([key, value]) => (
            <tr key={key}>
              <th scope="row">
                <code>{key}</code>
              </th>
              <td>
                <code data-env={key}>
                  {value === undefined
                    ? "undefined"
                    : value === ""
                      ? '"" (пустая строка)'
                      : value}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
