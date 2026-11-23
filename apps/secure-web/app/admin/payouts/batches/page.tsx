import type { Metadata } from 'next';
import Link from 'next/link';
import { BATCH_STATUS, EXPORT_FORMAT, StatusBadge } from '@/components/admin/labels';
import { Card, EmptyState, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { requireStaff } from '@/lib/admin';
import { formatDate, formatTaka, sumTaka } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import { listAllPayoutWindows, type BatchStatus, type DisbursementBatch, type ExportFormat } from '@/lib/payouts';
import { getPage } from '@/lib/server-api';
import { PAYOUTS_PATH, PayoutTabs, SimplePagination, linkClass, one, pageParam, windowName } from '../ui';

export const metadata: Metadata = {
  title: 'Batches · HoneyComb Admin',
};

const PATH = `${PAYOUTS_PATH}/batches`;
const STATUSES = ['draft', 'exported', 'confirmed'] as const satisfies readonly BatchStatus[];
const FORMATS = ['cbl', 'beftn'] as const satisfies readonly ExportFormat[];

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-black';

// What each status asks of the team, shown above a filtered list.
const NEXT_STEP: Record<BatchStatus, string> = {
  draft: 'Not sent to the bank yet. Open a batch to finish adding items, download its file and mark it as sent.',
  exported: 'Sent to the bank. Once the bank has paid, open the batch and confirm the payment.',
  confirmed: 'Paid. These are kept for the record.',
};

export default async function PayoutBatchesPage(props: PageProps<'/admin/payouts/batches'>) {
  await requireStaff(PATH);
  const params = await props.searchParams;
  const rawStatus = one(params.status);
  const status = STATUSES.find((s) => s === rawStatus) ?? 'all';
  const rawFormat = one(params.format);
  const format = FORMATS.find((f) => f === rawFormat) ?? 'all';
  const page = pageParam(params.page);

  // Unfinished batches oldest payment date first (the one to chase first);
  // otherwise newest first.
  const unfinished = status === 'draft' || status === 'exported';
  const api = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy: unfinished ? 'batchDate' : 'createdAt',
    sortOrder: unfinished ? 'asc' : 'desc',
  });
  if (status !== 'all') api.set('status', status);
  if (format !== 'all') api.set('exportType', format);

  const [{ data: batches, meta }, windows] = await Promise.all([
    getPage<DisbursementBatch>('/admin/disbursement-batch', api, PATH),
    listAllPayoutWindows(PATH),
  ]);
  const windowById = new Map(windows.map((w) => [w.id, w]));
  const filtered = status !== 'all' || format !== 'all';

  const hrefFor = (p: number) =>
    `${PATH}?${new URLSearchParams({
      ...(status !== 'all' && { status }),
      ...(format !== 'all' && { format }),
      page: String(p),
    })}`;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        description="Every bank batch, across all payout windows. New batches are created inside a window."
      />
      <PayoutTabs current="batches" />

      <Card>
        <form method="get" action={PATH} className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center">
          <label htmlFor="batches-status" className="sr-only">
            Status
          </label>
          <select id="batches-status" name="status" defaultValue={status} className={fieldClass}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {BATCH_STATUS[s][0]}
              </option>
            ))}
          </select>
          <label htmlFor="batches-format" className="sr-only">
            Bank file
          </label>
          <select id="batches-format" name="format" defaultValue={format} className={fieldClass}>
            <option value="all">CBL and BEFTN</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {EXPORT_FORMAT[f].label} only
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Apply
          </button>
          {filtered && (
            <Link href={PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
              Clear
            </Link>
          )}
        </form>

        {status !== 'all' && (
          <p className="border-b border-hairline px-5 py-3 text-sm leading-5 text-secondary">{NEXT_STEP[status]}</p>
        )}

        {batches.length === 0 ? (
          <EmptyState
            title="No batches"
            body={
              filtered
                ? 'No batches match this filter.'
                : 'Open a payout window and create a batch in it.'
            }
          />
        ) : (
          <Table
            minWidth={880}
            head={
              <tr>
                <th className={th}>Batch</th>
                <th className={th}>Payout window</th>
                <th className={th}>Bank file</th>
                <th className={th}>Payment date</th>
                <th className={thNum}>Items</th>
                <th className={thNum}>Total</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {batches.map((b) => {
              const w = windowById.get(b.windowId);
              return (
                <tr key={b.id}>
                  <td className={td}>
                    <Link href={`${PAYOUTS_PATH}/batches/${b.id}`} className={linkClass}>
                      {b.slotLabel}
                    </Link>
                    <span className="block text-xs leading-4 text-muted">Created {formatDate(b.createdAt)}</span>
                  </td>
                  <td className={td}>
                    {w ? (
                      <Link href={`${PAYOUTS_PATH}/windows/${w.id}`} className={linkClass}>
                        {windowName(w)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={td}>{EXPORT_FORMAT[b.exportType].label}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(b.batchDate)}</td>
                  <td className={tdNum}>{b.items.length}</td>
                  <td className={tdNum}>{formatTaka(sumTaka(b.items.map((i) => i.amount)))}</td>
                  <td className={td}>
                    <StatusBadge labels={BATCH_STATUS} status={b.status} />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['batch', 'batches']} />
      </Card>
    </>
  );
}
