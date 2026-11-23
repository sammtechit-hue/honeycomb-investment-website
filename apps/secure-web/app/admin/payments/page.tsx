import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/admin/action-button';
import { DocumentLink } from '@/components/admin/document';
import { PAYMENT_METHOD, PAYMENT_STATUS, StatusBadge, optionsOf } from '@/components/admin/labels';
import { FilterBar, Pagination } from '@/components/admin/list-controls';
import { Card, EmptyState, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { listPayments, requireStaff, type AdminPayment, type PaymentStatus } from '@/lib/admin';
import { formatDate, formatTaka } from '@/lib/format';
import { parseListQuery } from '@/lib/list-query';

export const metadata: Metadata = {
  title: 'Payments · HoneyComb Admin',
};

const PATH = '/admin/payments';
const STATUSES = ['pending', 'overdue', 'confirmed'] as const satisfies readonly PaymentStatus[];
const link = 'underline decoration-rule underline-offset-2 hover:decoration-black';

// Payments are made outside the website (usually bank transfer); investors
// record them with a receipt and the team confirms each one here after
// checking the money arrived.
export default async function AdminPaymentsPage(props: PageProps<'/admin/payments'>) {
  await requireStaff(PATH);
  const query = parseListQuery(await props.searchParams, STATUSES, 'pending', { sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: payments, meta } = await listPayments(query.api, PATH);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payments"
        description="Payments investors have recorded. Check each one reached HoneyComb’s account before confirming it."
      />

      <Card>
        <div className="border-b border-hairline px-5 py-4">
          <FilterBar
            path={PATH}
            search={query.search}
            searchPlaceholder="Investor name or sender account"
            status={query.status}
            statusOptions={optionsOf(PAYMENT_STATUS)}
          />
        </div>

        {payments.length === 0 ? (
          <EmptyState
            title={query.status === 'pending' && !query.search ? 'No payments to confirm' : 'No payments found'}
            body={
              query.status === 'pending' && !query.search
                ? 'New payments appear here when investors record them.'
                : 'Try another search or status.'
            }
          />
        ) : (
          <Table
            minWidth={1100}
            head={
              <tr>
                <th className={th}>Investor</th>
                <th className={thNum}>Paid</th>
                <th className={th}>Method</th>
                <th className={th}>Recorded</th>
                <th className={th}>Receipt</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </Table>
        )}

        <Pagination path={PATH} query={query} page={query.page} totalPages={meta.totalPages} total={meta.total} />
      </Card>
    </>
  );
}

function PaymentRow({ payment: p }: { payment: AdminPayment }) {
  const endpoint = `/api/admin/incoming-payment/${p.id}`;
  const mismatch = Number(p.amount) !== Number(p.investment.amount);

  return (
    <tr>
      <td className={td}>
        <Link href={`/admin/investors/${p.investment.investorId}`} className={`font-semibold ${link}`}>
          {p.investment.investor.fullname}
        </Link>
        <Link href={`/admin/investments/${p.investmentId}`} className={`block text-xs leading-4 text-muted ${link}`}>
          {p.investment.project.name} · {formatTaka(p.investment.amount)}
        </Link>
      </td>
      <td className={tdNum}>
        {formatTaka(p.amount)}
        {mismatch && <span className="block text-xs leading-4 font-semibold text-ink">Doesn’t match investment</span>}
      </td>
      <td className={td}>
        {PAYMENT_METHOD[p.paymentMethod] ?? p.paymentMethod}
        {p.senderAccountInfo && (
          <span className="block max-w-[220px] text-xs leading-4 break-words text-muted">{p.senderAccountInfo}</span>
        )}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {formatDate(p.createdAt)}
        {p.confirmedAt && <span className="block text-xs leading-4 text-muted">Confirmed {formatDate(p.confirmedAt)}</span>}
      </td>
      <td className={td}>
        <DocumentLink url={p.screenshotUrl}>Open receipt</DocumentLink>
      </td>
      <td className={td}>
        <StatusBadge labels={PAYMENT_STATUS} status={p.status} />
      </td>
      <td className={`${td} min-w-[200px]`}>
        <div className="flex flex-col items-end gap-2">
          {p.status !== 'confirmed' && (
            <ActionButton
              endpoint={endpoint}
              body={{ status: 'confirmed' }}
              label="Confirm"
              confirm={`Received ${formatTaka(p.amount)}?`}
            />
          )}
          {p.status === 'pending' && (
            <ActionButton
              endpoint={endpoint}
              body={{ status: 'overdue' }}
              label="Mark overdue"
              confirm="Mark as overdue?"
              variant="secondary"
            />
          )}
          {p.status === 'confirmed' && p.investment.status === 'pending' && (
            <Link href={`/admin/investments/${p.investmentId}`} className={`text-sm leading-5 ${link}`}>
              Activate investment
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}
