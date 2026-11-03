// Server-only — the public marketing site, where the terms page lives.
export const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3002';

export const TERMS_URL = `${PUBLIC_WEB_URL}/en/legal`;
