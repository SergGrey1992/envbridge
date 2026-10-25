import { connection } from 'next/server';
import { headers } from 'next/headers';
import Link from 'next/link';
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  if ((await headers()).get('x-root-error') === 'yes') throw new Error('Root probe');
  const key = 'APP_NAME';
  const json = JSON.stringify({ APP_NAME: process.env[key] }).replace(/</g, '\\u003c');
  return <html><head><script dangerouslySetInnerHTML={{__html:`window.__probe=${json}`}} /></head><body><Link href="/missing">missing</Link>{children}</body></html>;
}
