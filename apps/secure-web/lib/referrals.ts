import { getEvery, getPage, type Page } from './server-api';

// Server-side reads for the referral screens. Shapes mirror the selects in
// apps/api/src/admin/{referral-code,referral}/…service.ts.
//
// How referrals work today:
// - An investor gets a referral code when their application is approved.
// - A code can be used once. Someone who signs up with it is recorded as a
//   referral of the code's owner, with a 1% bonus rate and no amount yet.
// - Staff decide the bonus and record its amount on the referral.

type InvestorRef = { id: string; fullname: string };

export type AdminReferralCode = {
  id: string;
  code: string;
  isUsed: boolean;
  isActive: boolean;
  referrer: InvestorRef;
  referred: InvestorRef | null;
  createdAt: string;
  // Stored as Bangladesh clock time with no zone (see wallClockDate).
  expiresAt: string;
  usedAt: string | null;
};

export type AdminReferral = {
  id: string;
  bonusPercent: string | null;
  bonusAmount: string | null;
  createdAt: string;
  referralCode: { id: string; code: string };
  referrer: InvestorRef;
  referredInvestor: InvestorRef;
};

export function listReferralCodes(query: URLSearchParams, returnTo: string): Promise<Page<AdminReferralCode>> {
  return getPage<AdminReferralCode>('/admin/referral-code', query, returnTo);
}

export function listReferrals(query: URLSearchParams, returnTo: string): Promise<Page<AdminReferral>> {
  return getPage<AdminReferral>('/admin/referral', query, returnTo);
}

// Referrals with no bonus amount yet. The API can filter on an amount range
// but not on "no amount", so read them all and filter here.
export async function getUnrecordedReferrals(
  filters: { search?: string; referrerId?: string },
  returnTo: string,
) {
  const { rows, complete } = await getEvery<AdminReferral>(
    '/admin/referral',
    {
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...(filters.search && { search: filters.search }),
      ...(filters.referrerId && { referrerId: filters.referrerId }),
    },
    returnTo,
  );
  return { rows: rows.filter((r) => r.bonusAmount == null), complete };
}

// `expiresAt` defaults to "Dhaka now + 1 year" written as a zoneless
// timestamp, and the API compares it with Dhaka clock time. So its digits
// are already Bangladesh time: read them as they are, never shift them.
const wallClockFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function wallClockDate(iso: string) {
  return wallClockFormat.format(new Date(iso));
}

// Bangladesh clock time now, in the same zoneless form ("2026-11-21T14:22:58").
export function dhakaWallClockNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka' }).replace(' ', 'T');
}

export type CodeState = 'available' | 'used' | 'replaced' | 'expired';

// In the order the signup check effectively applies them.
export function codeState(c: Pick<AdminReferralCode, 'isUsed' | 'isActive' | 'expiresAt'>): CodeState {
  if (c.isUsed) return 'used';
  if (!c.isActive) return 'replaced';
  if (c.expiresAt.slice(0, 19) < dhakaWallClockNow()) return 'expired';
  return 'available';
}
