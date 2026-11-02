import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';

export type SessionUser = {
  id: string;
  email: string;
  phone: string | null;
  role: 'INVESTOR' | 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN';
  lastLoginAt: string | null;
};

// The browser's cookies, forwarded on server-side API calls.
export async function sessionCookieHeader(): Promise<string> {
  return (await cookies()).toString();
}

// null = signed out (no access token, or the API rejected it). Any other
// API failure throws, so an outage shows the error page instead of
// bouncing the user through sign-in in a loop.
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has('access_token')) return null;

  const res = await apiFetch('/auth/me', {
    headers: { cookie: cookieStore.toString() },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /auth/me failed (${res.status})`);
  return (await res.json()) as SessionUser;
}

// `path` is where to return after the session is renewed (see
// app/api/auth/resume/route.ts) or, failing that, after signing in.
export async function requireSessionUser(path: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/api/auth/resume?next=${encodeURIComponent(path)}`);
  return user;
}

// For /login and /signup: a signed-in user has nothing to do there.
export async function redirectIfSignedIn(next = '/') {
  if (await getSessionUser()) redirect(next);
}
