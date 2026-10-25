export function value(): string | undefined {
  if (typeof window === 'undefined') { const key = 'APP_NAME'; return process.env[key]; }
  const w = window as Window & { __probe?: { APP_NAME?: string } };
  if (!w.__probe) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/__runtime-env', false); xhr.send();
    if (xhr.status !== 200) throw new Error('Bootstrap failed');
    w.__probe = JSON.parse(xhr.responseText) as { APP_NAME?: string };
  }
  return w.__probe?.APP_NAME;
}
