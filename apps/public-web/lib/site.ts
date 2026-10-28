// Registration and sign-in live in secure-web (secure server). public-web
// only links there; it never handles accounts itself.
// NEXT_PUBLIC_ because the sticky CTA bar is a Client Component.
export const SECURE_WEB_URL =
  process.env.NEXT_PUBLIC_SECURE_WEB_URL ?? 'http://localhost:3001';

export const REGISTER_URL = `${SECURE_WEB_URL}/register`;
export const SIGN_IN_URL = `${SECURE_WEB_URL}/login`;

// Maximum per withdrawal request (brief), quoted in the FAQ and legal page.
export const WITHDRAWAL_LIMIT = 200_000;

// Base API URL for server-to-server requests to the backend service.
export const API_BASE_URL =
  process.env.API_URL ??
  process.env.API_BASE_URL ??
  'http://localhost:3000/api';

/**
 * Checks whether demo / mock data should be displayed.
 * Controlled by the SHOW_DEMO environment variable.
 * If SHOW_DEMO is 'true' or '1', mock data is shown.
 * Otherwise, dynamic data is fetched from the backend API.
 */
export function isShowDemo(): boolean {
  const val = process.env.SHOW_DEMO?.toLowerCase().trim();
  return val === 'true' || val === '1';
}
