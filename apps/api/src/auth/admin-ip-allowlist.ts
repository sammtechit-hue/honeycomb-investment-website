import { BlockList, isIP } from 'node:net';

// AdminProfile.allowedIpRange holds a comma-separated list of single IPs
// and/or CIDR ranges, IPv4 or IPv6, e.g. "203.0.113.7, 10.20.0.0/16".
// null/empty = no restriction for that admin.
//
// Fails CLOSED: if any entry is malformed, nobody gets in on that profile
// until it's fixed, rather than silently ignoring the bad entry and
// possibly allowing everyone.
export function isIpAllowed(
  clientIp: string | undefined,
  allowedIpRange: string | null | undefined,
): boolean {
  const list = parseAllowlist(allowedIpRange);
  if (list === 'unrestricted') return true;
  if (list === 'invalid' || !clientIp) return false;

  const ip = normalizeIp(clientIp);
  const family = isIP(ip);
  if (family === 0) return false;
  return list.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

// For validating input before it's saved (admin creation).
export function isValidAllowlist(allowedIpRange: string): boolean {
  return parseAllowlist(allowedIpRange) !== 'invalid';
}

function parseAllowlist(
  allowedIpRange: string | null | undefined,
): BlockList | 'unrestricted' | 'invalid' {
  const entries = (allowedIpRange ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return 'unrestricted';

  const list = new BlockList();
  for (const entry of entries) {
    const [address, prefix, ...rest] = entry.split('/');
    const family = isIP(address);
    if (family === 0 || rest.length > 0) return 'invalid';
    const type = family === 4 ? 'ipv4' : 'ipv6';

    if (prefix === undefined) {
      list.addAddress(address, type);
      continue;
    }

    const maxBits = family === 4 ? 32 : 128;
    if (!/^\d{1,3}$/.test(prefix) || Number(prefix) > maxBits) return 'invalid';
    list.addSubnet(address, Number(prefix), type);
  }
  return list;
}

// Express reports IPv4 clients on a dual-stack socket as "::ffff:1.2.3.4";
// unwrap so they match IPv4 allowlist entries.
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}
