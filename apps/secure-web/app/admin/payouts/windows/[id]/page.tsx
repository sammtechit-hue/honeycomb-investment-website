import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BATCH_STATUS, EXPORT_FORMAT, PAYOUT_WINDOW_STATUS, StatusBadge } from '@/components/admin/labels';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { canManage, requireStaff } from '@/lib/admin';
import { formatCycle, formatDate, formatTaka, sumTaka } from '@/lib/format';
import { isOverdue, listAllBatches, listAllPayoutWindows } from '@/lib/payouts';
import { HistoryLink } from '../../../audit/ui';
import { CreateBatchForm } from '../../batch-forms';
import { Details, PAYOUTS_PATH, UUID_RE, linkClass, windowName } from '../../ui';
import { WindowForm } from '../../window-form';

export const metadata: Metadata = {
  title: 'Payout window · HoneyComb Admin',
};

export default async function PayoutWindowPage(props: PageProps<'/admin/payouts/windows/[id]'>) {
  const { id } = await props.params;
  const returnTo = `${PAYOUTS_PATH}/windows/${id}`;
  const user = await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();

  const [allWindows, allBatches] = await Promise.all([
    listAllPayoutWindows(returnTo),
    listAllBatches(returnTo),
  ]);
  const pw = allWindows.find((w) => w.id === id);
  if (!pw) notFound();

  const batches = allBatches.filter((b) => b.windowId === id);
  const manage = canManage(user.role);
  const open = pw.status === 'open';
  const overdue = isOverdue(pw);
  const unpaid = batches.filter((b) => b.status !== 'confirmed');
  const totalOf = (b: (typeof batches)[number]) => sumTaka(b.items.map((i) => i.amount));

  return (
    <>
      <p className="text-sm leading-5">
        <Link href={PAYOUTS_PATH} className="text-muted underline decoration-rule underline-offset-2 hover:text-ink">
          ← Payout windows
        </Link>
      </p>
      <PageHeader
        eyebrow="Payout window"
        title={windowName(pw)}
        description={`Money goes out ${formatCycle(pw.startDate, pw.endDate)}.`}
        actions={
          <>
            <StatusBadge labels={PAYOUT_WINDOW_STATUS} status={pw.status} />
            {overdue && <Badge tone="outline">Past last day</Badge>}
            <HistoryLink role={user.role} targetId={pw.id} />
          </>
        }
      />

      {overdue && unpaid.length > 0 && (
        <Notice title="The last payout day has passed">
          {unpaid.length} {unpaid.length === 1 ? 'batch hasn’t' : 'batches haven’t'} been confirmed as paid yet.
        </Notice>
      )}

      <Card title="Details">
        <Details
          items={[
            ['Pays profit for', windowName(pw)],
            ['First payout day', formatDate(pw.startDate)],
            ['Last payout day', formatDate(pw.endDate)],
            ['Batches', String(batches.length)],
            ['In batches', formatTaka(sumTaka(batches.flatMap((b) => b.items.map((i) => i.amount))))],
            [
              'Paid',
              formatTaka(
                sumTaka(batches.filter((b) => b.status === 'confirmed').flatMap((b) => b.items.map((i) => i.amount))),
              ),
            ],
            ['Opened', formatDate(pw.createdAt)],
            ['Completed', pw.completedAt ? formatDate(pw.completedAt) : 'Not yet'],
          ]}
        />
      </Card>

      <Card title="Batches" description="One bank file each. Open a batch to add payout items, download its file and confirm payment.">
        {batches.length === 0 ? (
          <EmptyState
            title="No batches yet"
            body={open ? 'Create a CBL or BEFTN batch below.' : 'This window has no batches.'}
          />
        ) : (
          <Table
            minWidth={760}
            head={
              <tr>
                <th className={th}>Batch</th>
                <th className={th}>Bank file</th>
                <th className={th}>Payment date</th>
                <th className={thNum}>Items</th>
                <th className={thNum}>Total</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {batches.map((b) => (
              <tr key={b.id}>
                <td className={td}>
                  <Link href={`${PAYOUTS_PATH}/batches/${b.id}`} className={linkClass}>
                    {b.slotLabel}
                  </Link>
                  <span className="block text-xs leading-4 text-muted">Created {formatDate(b.createdAt)}</span>
                </td>
                <td className={td}>
                  {EXPORT_FORMAT[b.exportType].label}
                  <span className="block text-xs leading-4 text-muted">{EXPORT_FORMAT[b.exportType].hint}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(b.batchDate)}</td>
                <td className={tdNum}>{b.items.length}</td>
                <td className={tdNum}>{formatTaka(totalOf(b))}</td>
                <td className={td}>
                  <StatusBadge labels={BATCH_STATUS} status={b.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
        {open && (
          <div className="border-t border-hairline p-5">
            <h3 className="pb-4 text-sm leading-5 font-semibold text-ink">New batch</h3>
            <CreateBatchForm windowId={pw.id} />
          </div>
        )}
      </Card>

      {manage && open && (
        <Card title="Change window" description="Correct the month or the payout days.">
          <div className="p-5">
            <WindowForm
              existing={pw}
              takenMonths={allWindows.filter((w) => w.id !== pw.id).map((w) => w.periodMonth.slice(0, 7))}
            />
          </div>
        </Card>
      )}
    </>
  );
}
