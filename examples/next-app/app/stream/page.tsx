import { Suspense } from "react";
import { env } from "../../runtime-env/client";
import View from "../view";
async function Delayed() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return (
    <>
      <p id="stream">{env.APP_NAME}</p>
      <View />
    </>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Delayed />
    </Suspense>
  );
}
