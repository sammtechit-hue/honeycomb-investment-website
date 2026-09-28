export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// The refresh cookie is only ever sent to the auth endpoints that consume
// it — never to ordinary API calls — which shrinks where it can leak
// (logs, other handlers). Includes the global 'api' prefix from main.ts.
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

// Account lockout (per identifier, see LoginAttempt model).
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

// A consumed refresh token presented again within this window is treated as
// a benign race (two tabs refreshing at once), not theft — the request is
// rejected but the session family is left alone. After it, reuse revokes
// the whole family.
export const REFRESH_REUSE_GRACE_SECONDS = 10;

export const BCRYPT_ROUNDS = 12;
