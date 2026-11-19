import type { Metadata } from 'next';
import Link from 'next/link';
import { INVESTMENT_STATUS, PAYMENT_STATUS, StatusBadge, optionsOf } from '@/components/admin/labels';
import { FilterBar, Pagination } from '@/components/admin/list-controls';
import { payoutLabel } from '@/components/dashboard/labels';
import { Badge, Card, EmptyState, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { listInvestments, requireStaff } from '@/lib/admin';
import { formatDate, formatTaka } from '@/lib/format';
import type { InvestmentStatus } from '@/lib/investor';
import { parseListQuery } from '@/lib/list-query';

export const metadata: Metadata = {
  title: 'Investments · HoneyComb Admin',
};

const PATH = '/admin/investments';
const STATUSES = ['pending', 'active', 'rejected', 'closed'] as const satisfies readonly InvestmentStatus[];

export default async function AdminInvestmentsPage(props: PageProps<'/admin/investments'>) {
  await requireStaff(PATH);
  const query = parseListQuery(await props.searchParams, STATUSES, 'all', { sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: investments, meta } = await listInvestments(query.api, PATH);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Investments"
        description="Every investment request and top-up. Activate a request once its payment is confirmed."
      />

      <Card>
        <div className="border-b border-hairline px-5 py-4">
          <FilterBar
            path={PATH}
            search={query.search}
            searchPlaceholder="Investor name"
            status={query.status}
            statusOptions={optionsOf(INVESTMENT_STATUS)}
          />
        </div>

        {investments.length === 0 ? (
          <EmptyState
            title="No investments found"
            body={query.search || query.status !== 'all' ? 'Try another search or status.' : 'No investment requests yet.'}
          />
        ) : (
          <Table
            minWidth={960}
            head={
              <tr>
                <th className={th}>Investor</th>
                <th className={th}>Project</th>
                <th className={thNum}>Amount</th>
                <th className={th}>Payout</th>
                <th className={th}>Requested</th>
                <th className={th}>Payment</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {investments.map((i) => (
              <tr key={i.id}>
                <td className={td}>
                  <Link
                    href={`${PATH}/${i.id}`}
                    className="font-semibold underline decoration-rule underline-offset-2 hover:decoration-black"
                  >
                    {i.investor.fullname}
                  </Link>
                </td>
                <td className={td}>{i.project.name}</td>
                <td className={tdNum}>{formatTaka(i.amount)}</td>
                <td className={td}>
                  {payoutLabel(i.disbursementPeriod)}
                  {i.investmentPeriodMonths && (
                    <span className="block text-xs leading-4 text-muted">{i.investmentPeriodMonths}-month term</span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(i.createdAt)}</td>
                <td className={td}>
                  {i.incomingPayments ? (
                    <StatusBadge labels={PAYMENT_STATUS} status={i.incomingPayments.status} />
                  ) : (
                    <Badge tone="outline">Not submitted</Badge>
                  )}
                </td>
                <td className={td}>
                  <StatusBadge labels={INVESTMENT_STATUS} status={i.status} />
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
