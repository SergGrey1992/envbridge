"use client";
import { env } from "../runtime-env/client";
export default function GlobalError() {
  return (
    <html>
      <body>
        <p id="global">{env.APP_NAME}</p>
        <button
          onClick={() => {
            document.cookie = "root_fail=; Max-Age=0; path=/";
            window.location.href = "/";
          }}
        >
          Recover
        </button>
      </body>
    </html>
  );
}
