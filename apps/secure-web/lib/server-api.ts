import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { sessionCookieHeader } from './session';

// Server-side GETs to the Nest API with the browser's session cookies, shared
// by the investor dashboard and the admin panel.

export type Page<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

// 401 → renew the session and come back; 404 → null; anything else throws
// so an outage shows the error page.
export async function getJson<T>(path: string, returnTo: string): Promise<T | null> {
  const res = await apiFetch(path, { headers: { cookie: await sessionCookieHeader() } });
  if (res.status === 401) redirect(`/api/auth/resume?next=${encodeURIComponent(returnTo)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

// One page of a list endpoint. An empty page stands in for a 404.
export async function getPage<T>(path: string, query: URLSearchParams, returnTo: string): Promise<Page<T>> {
  const res = await getJson<Page<T>>(`${path}?${query.toString()}`, returnTo);
  return res ?? { data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
}

// The API caps `limit` at 100, so walk the pages (bounded, to stay safe).
export async function getAll<T>(path: string, query: string, returnTo: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await getJson<Page<T>>(`${path}?${query}&limit=100&page=${page}`, returnTo);
    if (!res) break;
    rows.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return rows;
}
