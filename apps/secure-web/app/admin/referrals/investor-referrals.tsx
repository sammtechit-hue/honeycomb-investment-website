import Link from 'next/link';
import { REFERRAL_CODE_STATE, StatusBadge } from '@/components/admin/labels';
import { Card } from '@/components/dashboard/ui';
import { formatDate, formatTaka, sumTaka } from '@/lib/format';
import { codeState, listReferralCodes, listReferrals, wallClockDate } from '@/lib/referrals';
import { linkClass } from '../payouts/ui';
import { REFERRALS_PATH } from './ui';

// The referral side of one investor, for their admin page: their codes,
// who referred them, and who they've referred.
export async function InvestorReferrals({ investorId, returnTo }: { investorId: string; returnTo: string }) {
  const q = (o: Record<string, string>) => new URLSearchParams({ limit: '100', sortBy: 'createdAt', sortOrder: 'desc', ...o });
  const [codes, referredBy, referredOthers] = await Promise.all([
    listReferralCodes(q({ referrerId: investorId }), returnTo),
    listReferrals(q({ referredInvestorId: investorId, limit: '1' }), returnTo),
    listReferrals(q({ referrerId: investorId }), returnTo),
  ]);
  const current = codes.data.find((c) => codeState(c) === 'available') ?? null;
  const by = referredBy.data[0] ?? null;
  const recorded = sumTaka(referredOthers.data.map((r) => r.bonusAmount));
  const unrecorded = referredOthers.data.filter((r) => r.bonusAmount == null).length;

  return (
    <Card title="Referrals">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">Current code</dt>
          <dd className="text-sm leading-5 text-ink">
            {current ? (
              <>
                <span className="font-mono font-semibold">{current.code}</span>
                <span className="block text-xs leading-4 text-muted">Valid through {wallClockDate(current.expiresAt)}</span>
              </>
            ) : codes.data.length > 0 ? (
              <>
                None ready to use
                <span className="block text-xs leading-4 text-muted">
                  Latest {codes.data[0].code}:{' '}
                  {REFERRAL_CODE_STATE[codeState(codes.data[0])][0].toLowerCase()}
                </span>
              </>
            ) : (
              'None yet (issued on approval)'
            )}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">Referred by</dt>
          <dd className="text-sm leading-5 text-ink">
            {by ? (
              <>
                <Link href={`/admin/investors/${by.referrer.id}`} className={linkClass}>
                  {by.referrer.fullname}
                </Link>
                <span className="block text-xs leading-4 text-muted">
                  Code {by.referralCode.code} · {formatDate(by.createdAt)}
                </span>
              </>
            ) : (
              'No one'
            )}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">Has referred</dt>
          <dd className="text-sm leading-5 text-ink">
            {referredOthers.meta.total === 0 ? (
              'No one yet'
            ) : (
              <>
                <Link
                  href={`${REFERRALS_PATH}?referrer=${investorId}`}
                  className={linkClass}
                >
                  {referredOthers.meta.total} {referredOthers.meta.total === 1 ? 'investor' : 'investors'}
                </Link>
                <span className="block text-xs leading-4 text-muted">
                  Bonuses recorded {formatTaka(recorded)}
                  {unrecorded > 0 && ` · ${unrecorded} not recorded yet`}
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>
      {codes.data.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-hairline px-5 py-3">
          {codes.data.map((c) => (
            <span key={c.id} className="flex items-center gap-2 text-xs leading-4 text-muted">
              <span className="font-mono text-ink">{c.code}</span>
              <StatusBadge labels={REFERRAL_CODE_STATE} status={codeState(c)} />
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
