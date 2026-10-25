import { env as client } from "./runtime-env/client";
import { env as server } from "./runtime-env/server";
const a: string | undefined = client.API_URL;
const b: string | undefined = server.JWT_SECRET;
// @ts-expect-error server keys are not public
client.JWT_SECRET;
// @ts-expect-error unknown keys
client.UNKNOWN;
// @ts-expect-error public keys are not server keys
server.API_URL;
// @ts-expect-error values may be undefined
const c: string = client.API_URL;
void [a, b, c];
