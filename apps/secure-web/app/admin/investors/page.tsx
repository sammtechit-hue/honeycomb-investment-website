import type { Metadata } from 'next';
import Link from 'next/link';
import { INVESTOR_STATUS, KYC_STATUS, StatusBadge, optionsOf } from '@/components/admin/labels';
import { FilterBar, Pagination } from '@/components/admin/list-controls';
import { categoryLabel } from '@/components/dashboard/shell';
import { Card, EmptyState, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { listInvestors, requireStaff } from '@/lib/admin';
import { formatDate, formatTaka } from '@/lib/format';
import type { InvestorStatus } from '@/lib/investor';
import { parseListQuery } from '@/lib/list-query';

export const metadata: Metadata = {
  title: 'Investors · HoneyComb Admin',
};

const PATH = '/admin/investors';
// The API's status filter doesn't accept "deactivated" yet, so it isn't
// offered as a filter; deactivated investors still show under "All".
const STATUSES = ['uploaded_kyc', 'pending', 'active', 'suspended'] as const satisfies readonly InvestorStatus[];

export default async function InvestorsPage(props: PageProps<'/admin/investors'>) {
  await requireStaff(PATH);
  const query = parseListQuery(await props.searchParams, STATUSES, 'all', { sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: investors, meta } = await listInvestors(query.api, PATH);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Investors"
        description="Everyone who has signed up. Open an investor to review their documents and approve them."
      />

      <Card>
        <div className="border-b border-hairline px-5 py-4">
          <FilterBar
            path={PATH}
            search={query.search}
            searchPlaceholder="Name, email or mobile"
            status={query.status}
            statusOptions={optionsOf(INVESTOR_STATUS).filter((o) => (STATUSES as readonly string[]).includes(o.value))}
          />
        </div>

        {investors.length === 0 ? (
          <EmptyState
            title="No investors found"
            body={query.search || query.status !== 'all' ? 'Try another search or status.' : 'No one has signed up yet.'}
          />
        ) : (
          <Table
            minWidth={900}
            head={
              <tr>
                <th className={th}>Investor</th>
                <th className={th}>Mobile</th>
                <th className={th}>Category</th>
                <th className={thNum}>Total invested</th>
                <th className={th}>Signed up</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {investors.map((investor) => (
              <tr key={investor.id}>
                <td className={td}>
                  <Link
                    href={`${PATH}/${investor.id}`}
                    className="font-semibold underline decoration-rule underline-offset-2 hover:decoration-black"
                  >
                    {investor.fullname}
                  </Link>
                  <span className="block text-xs leading-4 break-all text-muted">{investor.user.email}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>{investor.user.phone ?? '—'}</td>
                <td className={td}>{categoryLabel(investor.category)}</td>
                <td className={tdNum}>{formatTaka(investor.totalInvestmentAmount)}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(investor.createdAt)}</td>
                <td className={td}>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge labels={INVESTOR_STATUS} status={investor.status} />
                    {investor.kycDocuments && investor.status !== 'active' && (
                      <StatusBadge labels={KYC_STATUS} status={investor.kycDocuments.verificationStatus} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination path={PATH} query={query} page={query.page} totalPages={meta.totalPages} total={meta.total} />
      </Card>
    </>
  );
}
