"use client";
import { useState } from "react";
import { getPublicEnv } from "@serggrey1992/envbridge/client";
export default function View() {
  const [ready, setReady] = useState(false);
  return (
    <section>
      <p id="client">{getPublicEnv("APP_NAME")}</p>
      <p id="api">{getPublicEnv("API_URL")}</p>
      <button onClick={() => setReady(true)}>
        {ready ? "Hydrated" : "Check hydration"}
      </button>
    </section>
  );
}
