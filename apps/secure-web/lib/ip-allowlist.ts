// Checks a staff IP allowlist in the browser (the invite form). Kept apart
// from lib/staff.ts, which is server-only.
//
// Mirrors the API's allowlist rules (apps/api/src/auth/admin-ip-allowlist.ts):
// comma-separated single IPs or CIDR ranges, IPv4 or IPv6. The API checks
// again and is the authority; this only catches typos before sending.
function ipFamily(address: string): 4 | 6 | 0 {
  if (/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(address)) return 4;
  // Node's isIP (the API's check) also accepts an interface suffix: fe80::1%eth0.
  const bare = address.replace(/%[0-9a-z._-]+$/i, '');
  if (!bare.includes(':') || /[^0-9a-f:.]/i.test(bare)) return 0;
  try {
    new URL(`http://[${bare}]/`);
    return 6;
  } catch {
    return 0;
  }
}

export function allowlistError(value: string): string | null {
  const entries = value
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const [address, prefix, ...rest] = entry.split('/');
    const family = ipFamily(address);
    if (family === 0 || rest.length > 0) return `“${entry}” isn’t an IP address or range`;
    if (prefix !== undefined && (!/^\d{1,3}$/.test(prefix) || Number(prefix) > (family === 4 ? 32 : 128))) {
      return `“${entry}” has an invalid range size`;
    }
  }
  return null;
}
