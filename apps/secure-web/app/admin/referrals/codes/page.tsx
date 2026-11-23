import type { Metadata } from 'next';
import Link from 'next/link';
import { REFERRAL_CODE_STATE, StatusBadge } from '@/components/admin/labels';
import { Card, EmptyState, PageHeader, Table, td, th } from '@/components/dashboard/ui';
import { requireStaff } from '@/lib/admin';
import { formatDate } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import { codeState, listReferralCodes, wallClockDate } from '@/lib/referrals';
import { SimplePagination, linkClass, one, pageParam } from '../../payouts/ui';
import { ExpiryEditor } from '../referral-forms';
import { REFERRALS_PATH, ReferralTabs } from '../ui';

export const metadata: Metadata = {
  title: 'Referral codes · HoneyComb Admin',
};

const PATH = `${REFERRALS_PATH}/codes`;
const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

export default async function ReferralCodesPage(props: PageProps<'/admin/referrals/codes'>) {
  await requireStaff(PATH);
  const params = await props.searchParams;
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawUsed = one(params.used);
  const used = rawUsed === 'used' || rawUsed === 'unused' ? rawUsed : 'all';
  const page = pageParam(params.page);

  const api = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  if (search) api.set('search', search);
  if (used !== 'all') api.set('isUsed', used === 'used' ? 'true' : 'false');

  const { data: codes, meta } = await listReferralCodes(api, PATH);

  const hrefFor = (p: number) =>
    `${PATH}?${new URLSearchParams({ ...(search && { q: search }), ...(used !== 'all' && { used }), page: String(p) })}`;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Referrals"
        description="Each approved investor gets a referral code. A code works once; a new investor enters it when they apply."
      />
      <ReferralTabs current="codes" />

      <Card>
        <form method="get" action={PATH} className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center">
          <label htmlFor="codes-q" className="sr-only">
            Search
          </label>
          <input
            id="codes-q"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={150}
            placeholder="Code or investor name"
            className={`${fieldClass} w-full sm:w-72`}
          />
          <label htmlFor="codes-used" className="sr-only">
            Used
          </label>
          <select id="codes-used" name="used" defaultValue={used} className={fieldClass}>
            <option value="all">All codes</option>
            <option value="unused">Not used yet</option>
            <option value="used">Used</option>
          </select>
          <button
            type="submit"
            className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Apply
          </button>
          {(search || used !== 'all') && (
            <Link href={PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
              Clear
            </Link>
          )}
        </form>

        {codes.length === 0 ? (
          <EmptyState
            title="No referral codes"
            body={
              search || used !== 'all'
                ? 'Try another search or filter.'
                : 'Codes are issued when an investor’s application is approved.'
            }
          />
        ) : (
          <Table
            minWidth={960}
            head={
              <tr>
                <th className={th}>Code</th>
                <th className={th}>Owner</th>
                <th className={th}>Status</th>
                <th className={th}>Used by</th>
                <th className={th}>Issued</th>
                <th className={th}>Valid through</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {codes.map((c) => {
              const state = codeState(c);
              return (
                <tr key={c.id}>
                  <td className={`${td} font-mono text-sm font-semibold`}>{c.code}</td>
                  <td className={td}>
                    <Link href={`/admin/investors/${c.referrer.id}`} className={linkClass}>
                      {c.referrer.fullname}
                    </Link>
                  </td>
                  <td className={td}>
                    <StatusBadge labels={REFERRAL_CODE_STATE} status={state} />
                  </td>
                  <td className={td}>
                    {c.referred ? (
                      <>
                        <Link href={`/admin/investors/${c.referred.id}`} className={linkClass}>
                          {c.referred.fullname}
                        </Link>
                        {c.usedAt && <span className="block text-xs leading-4 text-muted">{formatDate(c.usedAt)}</span>}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(c.createdAt)}</td>
                  <td className={`${td} whitespace-nowrap`}>{wallClockDate(c.expiresAt)}</td>
                  <td className={`${td} text-right`}>
                    {/* Only a code that can still be used has an expiry worth changing. */}
                    {(state === 'available' || state === 'expired') && (
                      <ExpiryEditor id={c.id} expiresAt={c.expiresAt} />
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['code', 'codes']} />
      </Card>
    </>
  );
}
