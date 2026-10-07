// Registration and sign-in live in secure-web (secure server). public-web
// only links there; it never handles accounts itself.
// NEXT_PUBLIC_ because the sticky CTA bar is a Client Component.
export const SECURE_WEB_URL =
  process.env.NEXT_PUBLIC_SECURE_WEB_URL ?? 'http://localhost:3001';

export const REGISTER_URL = `${SECURE_WEB_URL}/register`;
export const SIGN_IN_URL = `${SECURE_WEB_URL}/login`;

// Maximum per withdrawal request (brief), quoted in the FAQ and legal page.
export const WITHDRAWAL_LIMIT = 200_000;
