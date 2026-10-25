"use client";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { env } from "../../runtime-env/client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <>
      <p id="error">{env.APP_NAME}</p>
      <button
        onClick={() => {
          document.cookie = "segment_fail=; Max-Age=0; path=/";
          startTransition(() => {
            router.refresh();
            reset();
          });
        }}
      >
        Retry
      </button>
    </>
  );
}
