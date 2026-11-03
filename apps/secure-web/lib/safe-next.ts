// Where to send the user after signing in / renewing a session. Only
// same-site paths are allowed — "//evil.com" or "/\evil.com" would be an
// open redirect.
export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
