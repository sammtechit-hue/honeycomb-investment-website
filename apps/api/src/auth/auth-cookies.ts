import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from './auth.constants';

export interface CookieSettings {
  secure: boolean;
  domain?: string;
}

// httpOnly: JS (including any XSS payload) can't read the tokens.
// sameSite 'strict': the browser never attaches them to a cross-site
// request, which is the primary CSRF defence (CsrfOriginMiddleware is the
// second). secure: HTTPS-only outside development.
function baseOptions(settings: CookieSettings): CookieOptions {
  return {
    httpOnly: true,
    secure: settings.secure,
    sameSite: 'strict',
    domain: settings.domain,
  };
}

export function setAuthCookies(
  res: Response,
  settings: CookieSettings,
  tokens: {
    accessToken: string;
    accessExpiresAt: Date;
    refreshToken: string;
    refreshExpiresAt: Date;
  },
) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseOptions(settings),
    path: '/',
    expires: tokens.accessExpiresAt,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseOptions(settings),
    path: REFRESH_TOKEN_COOKIE_PATH,
    expires: tokens.refreshExpiresAt,
  });
}

// Attributes (path/domain) must match the ones used when setting, or the
// browser treats it as a different cookie and keeps the original.
export function clearAuthCookies(res: Response, settings: CookieSettings) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseOptions(settings), path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...baseOptions(settings),
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}
