"use client";
import { env } from "../runtime-env/client";
export default function View() {
  return (
    <section>
      <p id="client">{env.APP_NAME}</p>
      <p id="prefix">{env.NEXT_PUBLIC_TEST}</p>
      <p id="api">{env.API_URL}</p>
      <p id="absent">{String(env.MISSING)}</p>
      <button
        onClick={() => {
          document.documentElement.dataset.hydrated = "yes";
        }}
      >
        Hydrated
      </button>
    </section>
  );
}
