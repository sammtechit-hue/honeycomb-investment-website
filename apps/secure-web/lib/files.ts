// Document links stored on investor records point at the API's encrypted
// file store: <secure-web origin>/api/files/kyc/<ownerId>/<fileId>. Only that
// exact shape is ever rendered as a link or image. The investor's payment
// receipt URL in particular is not checked by the API, so anything else
// (another site, a javascript: URL) is refused here rather than opened.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FILE_PATH = new RegExp(`^/api/files/kyc/${UUID}/${UUID}$`, 'i');

// The same-origin path to open, or null when the value isn't one of ours.
// Using the path (not the stored origin) keeps links working on any host
// secure-web is served from.
export function safeFilePath(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url, 'http://placeholder.invalid');
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (parsed.search || parsed.hash) return null;
  return FILE_PATH.test(parsed.pathname) ? parsed.pathname : null;
}
