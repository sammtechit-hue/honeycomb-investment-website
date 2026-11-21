import type { Metadata } from 'next';
import Link from 'next/link';
import { INVESTOR_STATUS, StatusBadge } from '@/components/admin/labels';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { getInvestor, requireStaff } from '@/lib/admin';
import { formatDate, formatRate, formatTaka, sumTaka } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import { getUnrecordedReferrals, listReferrals, type AdminReferral } from '@/lib/referrals';
import { pageOf, type Page } from '@/lib/server-api';
import { SimplePagination, UUID_RE, linkClass, one, pageParam } from '../payouts/ui';
import { BonusEditor } from './referral-forms';
import { REFERRALS_PATH, ReferralTabs } from './ui';

export const metadata: Metadata = {
  title: 'Referrals · HoneyComb Admin',
};

const BONUS_FILTERS = ['unrecorded', 'recorded'] as const;

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

export default async function AdminReferralsPage(props: PageProps<'/admin/referrals'>) {
  await requireStaff(REFERRALS_PATH);
  const params = await props.searchParams;
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawBonus = one(params.bonus);
  const bonus = BONUS_FILTERS.find((b) => b === rawBonus) ?? 'all';
  const page = pageParam(params.page);
  // From an investor's page: only the people they referred.
  const referrerParam = one(params.referrer) ?? '';
  const referrerId = UUID_RE.test(referrerParam) ? referrerParam : '';

  let referrals: AdminReferral[];
  let meta: Page<AdminReferral>['meta'];
  let complete = true;
  if (bonus === 'unrecorded') {
    // The API can't filter on "no amount yet": read them all, page here.
    const unrecorded = await getUnrecordedReferrals(
      { ...(search && { search }), ...(referrerId && { referrerId }) },
      REFERRALS_PATH,
    );
    ({ data: referrals, meta } = pageOf(unrecorded.rows, page, PAGE_SIZE));
    complete = unrecorded.complete;
  } else {
    const api = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (search) api.set('search', search);
    // An amount range only matches referrals that have an amount.
    if (bonus === 'recorded') api.set('minBonusAmount', '0');
    if (referrerId) api.set('referrerId', referrerId);
    ({ data: referrals, meta } = await listReferrals(api, REFERRALS_PATH));
  }

  // The referred investor's status and what they've invested, for deciding
  // the bonus. One read per investor on this page (at most PAGE_SIZE).
  const referredIds = [...new Set(referrals.map((r) => r.referredInvestor.id))];
  const referred = new Map(
    (await Promise.all(referredIds.map((id) => getInvestor(id, REFERRALS_PATH)))).flatMap((inv) =>
      inv ? [[inv.id, inv] as const] : [],
    ),
  );

  const recordedOnPage = sumTaka(referrals.map((r) => r.bonusAmount));
  const hrefFor = (p: number) =>
    `${REFERRALS_PATH}?${new URLSearchParams({
      ...(search && { q: search }),
      ...(bonus !== 'all' && { bonus }),
      ...(referrerId && { referrer: referrerId }),
      page: String(p),
    })}`;
  const filtered = !!(search || bonus !== 'all' || referrerId);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Referrals"
        description="Investors who signed up with someone’s referral code. Record the bonus owed to the investor who referred them."
      />
      <ReferralTabs current="referrals" />
      {referrerId && (
        <p className="text-sm leading-5 text-ink">
          Showing the people referred by{' '}
          <Link href={`/admin/investors/${referrerId}`} className={linkClass}>
            {referrals[0]?.referrer.fullname ?? 'this investor'}
          </Link>
          .{' '}
          <Link href={REFERRALS_PATH} className="text-muted underline">
            Show everyone
          </Link>
        </p>
      )}

      <Card>
        <form method="get" action={REFERRALS_PATH} className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center">
          <label htmlFor="ref-q" className="sr-only">
            Search
          </label>
          <input
            id="ref-q"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={150}
            placeholder="Investor name or code"
            className={`${fieldClass} w-full sm:w-72`}
          />
          <label htmlFor="ref-bonus" className="sr-only">
            Bonus
          </label>
          <select id="ref-bonus" name="bonus" defaultValue={bonus} className={fieldClass}>
            <option value="all">All referrals</option>
            <option value="unrecorded">Bonus not recorded</option>
            <option value="recorded">Bonus recorded</option>
          </select>
          {referrerId && <input type="hidden" name="referrer" value={referrerId} />}
          <button
            type="submit"
            className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Apply
          </button>
          {filtered && (
            <Link href={REFERRALS_PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
              Clear
            </Link>
          )}
        </form>

        {!complete && (
          <div className="border-b border-hairline px-5 py-3">
            <Notice title="This list may be incomplete">
              There are too many referrals to read at once, so some without a bonus may be missing.
            </Notice>
          </div>
        )}

        {referrals.length === 0 ? (
          <EmptyState
            title="No referrals"
            body={
              bonus === 'unrecorded' && !search && !referrerId
                ? 'Every referral has a bonus recorded.'
                : filtered
                  ? 'Try another search or filter.'
                : 'When someone signs up with an investor’s referral code, it shows here.'
            }
          />
        ) : (
          <Table
            minWidth={1040}
            head={
              <tr>
                <th className={th}>New investor</th>
                <th className={th}>Referred by</th>
                <th className={th}>Code</th>
                <th className={th}>Signed up</th>
                <th className={thNum}>Invested</th>
                <th className={th}>Bonus</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {referrals.map((r) => {
              const inv = referred.get(r.referredInvestor.id);
              return (
                <tr key={r.id}>
                  <td className={td}>
                    <Link href={`/admin/investors/${r.referredInvestor.id}`} className={linkClass}>
                      {r.referredInvestor.fullname}
                    </Link>
                    {inv && (
                      <span className="mt-1 block">
                        <StatusBadge labels={INVESTOR_STATUS} status={inv.status} />
                      </span>
                    )}
                  </td>
                  <td className={td}>
                    <Link href={`/admin/investors/${r.referrer.id}`} className={linkClass}>
                      {r.referrer.fullname}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{r.referralCode.code}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                  <td className={tdNum}>{inv ? formatTaka(inv.totalInvestmentAmount) : '—'}</td>
                  <td className={td}>
                    {r.bonusAmount != null ? (
                      <span className="font-semibold tabular-nums">{formatTaka(r.bonusAmount)}</span>
                    ) : (
                      <Badge tone="solid">Not recorded</Badge>
                    )}
                    <span className="block text-xs leading-4 text-muted">
                      Rate {r.bonusPercent != null ? formatRate(r.bonusPercent) : 'not set'}
                    </span>
                  </td>
                  <td className={`${td} text-right`}>
                    <BonusEditor
                      id={r.id}
                      bonusPercent={r.bonusPercent}
                      bonusAmount={r.bonusAmount}
                      invested={inv?.totalInvestmentAmount ?? null}
                    />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        {referrals.length > 0 && (
          <p className="border-t border-hairline px-5 py-3 text-xs leading-4 text-muted">
            Bonuses recorded on this page: {formatTaka(recordedOnPage)}. Recording a bonus doesn’t pay it; payment
            happens outside the platform for now.
          </p>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['referral', 'referrals']} />
      </Card>
    </>
  );
}
