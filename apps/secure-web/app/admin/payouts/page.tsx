import type { Metadata } from 'next';
import Link from 'next/link';
import { PAYOUT_WINDOW_STATUS, StatusBadge } from '@/components/admin/labels';
import { FormCard } from '@/components/dashboard/form';
import { Badge, Card, EmptyState, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { canManage, requireStaff } from '@/lib/admin';
import { formatCycle, formatTaka, sumTaka } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import {
  isOverdue,
  listAllBatches,
  listAllPayoutWindows,
  listPayoutWindows,
  overdueWindowQuery,
  type PayoutWindowStatus,
} from '@/lib/payouts';
import { PAYOUTS_PATH, PayoutTabs, SimplePagination, linkClass, one, pageParam, windowName } from './ui';
import { WindowForm } from './window-form';

export const metadata: Metadata = {
  title: 'Payouts · HoneyComb Admin',
};

// "overdue" isn't a stored status: open with the last payout day passed.
const STATUSES = ['open', 'overdue', 'completed'] as const satisfies readonly (PayoutWindowStatus | 'overdue')[];

export default async function AdminPayoutsPage(props: PageProps<'/admin/payouts'>) {
  const user = await requireStaff(PAYOUTS_PATH);
  const params = await props.searchParams;
  const rawStatus = one(params.status);
  const status = STATUSES.find((s) => s === rawStatus) ?? 'all';
  const page = pageParam(params.page);

  const api = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy: 'periodMonth',
    sortOrder: 'desc',
    ...(status === 'overdue' ? overdueWindowQuery() : status !== 'all' && { status }),
  });

  const manage = canManage(user.role);
  const [windows, batches, allWindows] = await Promise.all([
    listPayoutWindows(api, PAYOUTS_PATH),
    listAllBatches(PAYOUTS_PATH),
    manage ? listAllPayoutWindows(PAYOUTS_PATH) : Promise.resolve([]),
  ]);
  const takenMonths = allWindows.map((w) => w.periodMonth.slice(0, 7));

  const statsFor = (windowId: string) => {
    const own = batches.filter((b) => b.windowId === windowId);
    const items = own.flatMap((b) => b.items);
    return {
      batches: own.length,
      total: sumTaka(items.map((i) => i.amount)),
      paid: sumTaka(own.filter((b) => b.status === 'confirmed').flatMap((b) => b.items.map((i) => i.amount))),
    };
  };

  const hrefFor = (p: number) =>
    `${PAYOUTS_PATH}?${new URLSearchParams({ ...(status !== 'all' && { status }), page: String(p) })}`;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        description="Profit goes out in payout windows. Each window holds bank batches: CBL for City Bank accounts, BEFTN for every other bank."
      />
      <PayoutTabs current="windows" />

      {manage && (
        <FormCard
          title="Open a payout window"
          description="Choose the month whose profit is paid and the days the money goes out."
        >
          <WindowForm takenMonths={takenMonths} />
        </FormCard>
      )}

      <Card>
        <form method="get" action={PAYOUTS_PATH} className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center">
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-black"
          >
            <option value="all">All windows</option>
            <option value="open">Open</option>
            <option value="overdue">Open, past last day</option>
            <option value="completed">Completed</option>
          </select>
          <button
            type="submit"
            className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Apply
          </button>
        </form>

        {windows.data.length === 0 ? (
          <EmptyState
            title="No payout windows"
            body={
              status !== 'all'
                ? status === 'overdue'
                  ? 'Every open window is still within its payout days.'
                  : 'No windows with this status.'
                : manage
                  ? 'Open the first window above.'
                  : 'An admin opens a window before profit can be paid out.'
            }
          />
        ) : (
          <Table
            minWidth={820}
            head={
              <tr>
                <th className={th}>Pays profit for</th>
                <th className={th}>Payout days</th>
                <th className={thNum}>Batches</th>
                <th className={thNum}>In batches</th>
                <th className={thNum}>Paid</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {windows.data.map((w) => {
              const s = statsFor(w.id);
              return (
                <tr key={w.id}>
                  <td className={td}>
                    <Link href={`${PAYOUTS_PATH}/windows/${w.id}`} className={linkClass}>
                      {windowName(w)}
                    </Link>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatCycle(w.startDate, w.endDate)}</td>
                  <td className={tdNum}>{s.batches}</td>
                  <td className={tdNum}>{formatTaka(s.total)}</td>
                  <td className={tdNum}>{formatTaka(s.paid)}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge labels={PAYOUT_WINDOW_STATUS} status={w.status} />
                      {isOverdue(w) && <Badge tone="outline">Past last day</Badge>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <SimplePagination
          hrefFor={hrefFor}
          page={page}
          totalPages={windows.meta.totalPages}
          total={windows.meta.total}
          noun={['window', 'windows']}
        />
      </Card>
    </>
  );
}
