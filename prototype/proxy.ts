export function proxy() {
  const key = 'APP_NAME';
  return Response.json({ APP_NAME: process.env[key] }, { headers: { 'Cache-Control': 'no-store' } });
}
export const config = { matcher: '/__runtime-env' };
