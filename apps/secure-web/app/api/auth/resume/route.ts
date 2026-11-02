import { NextResponse, type NextRequest } from 'next/server';
import { apiFetch } from '@/lib/api';
import { safeNextPath } from '@/lib/safe-next';

// GET /api/auth/resume?next=/path
//
// Access tokens last 15 minutes, and the refresh cookie is path-scoped to
// /api/auth — so a page request can never renew a session itself. Pages
// that find the access token missing or expired redirect here instead: this
// route lives under /api/auth (the browser sends the refresh cookie), trades
// it for fresh cookies, and sends the user back where they were.
//
// Takes precedence over the /api/* rewrite in next.config.ts, which only
// applies when no app route matches.
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));
  const loginUrl = new URL(`/login?next=${encodeURIComponent(next)}`, request.url);

  if (!request.cookies.has('refresh_token')) {
    return NextResponse.redirect(loginUrl);
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  const apiRes = await apiFetch('/auth/refresh', {
    method: 'POST',
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      'user-agent': request.headers.get('user-agent') ?? '',
      ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
    },
  }).catch(() => null);

  const response = NextResponse.redirect(apiRes?.ok ? new URL(next, request.url) : loginUrl);
  // Relay the API's Set-Cookie headers verbatim: new tokens on success,
  // cleared cookies on failure (so a dead refresh token isn't retried).
  for (const cookie of apiRes?.headers.getSetCookie() ?? []) {
    response.headers.append('set-cookie', cookie);
  }
  return response;
}
