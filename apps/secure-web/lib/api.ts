// Server-only base URL — never exposed to the browser (no NEXT_PUBLIC_
// prefix). Pages and Server Actions fetch the Nest API from here; the
// browser only ever talks to secure-web itself.
const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000/api';

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
}
