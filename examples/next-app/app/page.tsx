import { env } from "../runtime-env/client";
import { env as serverEnv } from "../runtime-env/server";
import View from "./view";
export default function Page() {
  return (
    <>
      <p id="server">{env.APP_NAME}</p>
      <p id="secret-present">{String(Boolean(serverEnv.JWT_SECRET))}</p>
      <View />
    </>
  );
}
