import { env } from "./runtime-env/client";
const value: string | undefined = env.API_URL;
// @ts-expect-error secrets are not public
void env.JWT_SECRET;
// @ts-expect-error unknown key
void env.UNKNOWN;
void value;
