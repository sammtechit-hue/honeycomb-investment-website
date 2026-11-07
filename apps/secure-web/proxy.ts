import { NextResponse, type NextRequest } from 'next/server';

// Every secure-web page needs a signed-in user. This is the optimistic,
// cookie-only check that keeps signed-out visitors off the app; pages still
// validate the token with requireSessionUser (lib/session.ts).
//
// No access token → /api/auth/resume, which renews the session from the
// refresh cookie (path-scoped to /api/auth, so it isn't visible here) or,
// failing that, sends the user to /login?next=<path>.

// Signed-out pages. /reset-password and /set-password are opened from
// emailed links, so they must work without a session.
const PUBLIC_PATHS = new Set([
  '/login',
  '/signup',
  '/staff/login',
  '/forgot-password',
  '/reset-password',
  '/set-password',
]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || request.cookies.has('access_token')) {
    return NextResponse.next();
  }

  const resumeUrl = new URL('/api/auth/resume', request.url);
  resumeUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(resumeUrl);
}

export const config = {
  // Skip API routes (incl. /api/auth/resume and the API rewrite), Next
  // internals and public/ assets (anything with a file extension).
  matcher: ['/((?!api/|_next/|.*\\.[^/]+$).*)'],
};
