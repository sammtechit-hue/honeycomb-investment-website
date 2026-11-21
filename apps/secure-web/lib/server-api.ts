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

// Every row of a list endpoint. The API caps a page at 100; this walks up to
// 50 pages and reports whether it got them all, so a caller that must not
// miss a row (a bank file, a work-queue count) can say so instead of quietly
// working on part of it.
export async function getEvery<T>(path: string, query: Record<string, string>, returnTo: string) {
  const rows: T[] = [];
  let total = 0;
  for (let page = 1; page <= 50; page++) {
    const res = await getJson<Page<T>>(
      `${path}?${new URLSearchParams({ ...query, limit: '100', page: String(page) })}`,
      returnTo,
    );
    if (!res) break;
    rows.push(...res.data);
    total = res.meta.total;
    if (page >= res.meta.totalPages) break;
  }
  return { rows, complete: rows.length >= total };
}

// One page of rows already in memory (for filters the API can't apply).
export function pageOf<T>(rows: T[], page: number, limit: number): Page<T> {
  return {
    data: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) },
  };
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
