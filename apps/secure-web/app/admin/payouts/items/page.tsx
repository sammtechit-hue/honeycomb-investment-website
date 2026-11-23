import type { Metadata } from 'next';
import Link from 'next/link';
import { BATCH_STATUS, EXPORT_FORMAT, StatusBadge } from '@/components/admin/labels';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { requireStaff } from '@/lib/admin';
import { formatDate, formatTaka } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import { getAllUnbatchedItems, listPayoutItems, type DisbursementItem, type ExportFormat } from '@/lib/payouts';
import { pageOf, type Page } from '@/lib/server-api';
import { ItemActions } from '../batch-forms';
import { PAYOUTS_PATH, PayoutTabs, SimplePagination, linkClass, one, pageParam } from '../ui';
import { PrepareItemsButton } from './prepare-button';
import { ProfitRunCard } from './profit-run-card';

export const metadata: Metadata = {
  title: 'Payout items · HoneyComb Admin',
};

const PATH = `${PAYOUTS_PATH}/items`;
const FORMATS = ['cbl', 'beftn'] as const satisfies readonly ExportFormat[];

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

export default async function PayoutItemsPage(props: PageProps<'/admin/payouts/items'>) {
  await requireStaff(PATH);
  const params = await props.searchParams;
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawFormat = one(params.format);
  const format = FORMATS.find((f) => f === rawFormat) ?? 'all';
  // "none": only items waiting for a batch (the overview's queue).
  const waiting = one(params.batch) === 'none';
  const page = pageParam(params.page);

  let items: DisbursementItem[];
  let meta: Page<DisbursementItem>['meta'];
  let complete = true;
  if (waiting) {
    // The API can't filter on "no batch": read them all, page here.
    const unbatched = await getAllUnbatchedItems(
      { ...(search && { search }), ...(format !== 'all' && { format }) },
      PATH,
    );
    ({ data: items, meta } = pageOf(unbatched.rows, page, PAGE_SIZE));
    complete = unbatched.complete;
  } else {
    const api = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (search) api.set('search', search);
    if (format !== 'all') api.set('exportFormat', format);
    ({ data: items, meta } = await listPayoutItems(api, PATH));
  }
  const filtered = !!(search || format !== 'all' || waiting);

  const hrefFor = (p: number) =>
    `${PATH}?${new URLSearchParams({
      ...(search && { q: search }),
      ...(format !== 'all' && { format }),
      ...(waiting && { batch: 'none' }),
      page: String(p),
    })}`;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        description="A payout item is one investor’s due profit, ready to go into a bank batch."
      />
      <PayoutTabs current="items" />

      <ProfitRunCard returnTo={PATH} />

      <Card
        title="Prepare payout items"
        description="Step 2. Makes an item for every active investment whose profit is due, using the investor’s current bank account. Run it after the monthly profit run. Running it again only picks up profit that isn’t in an item yet."
      >
        <div className="p-5">
          <PrepareItemsButton />
        </div>
      </Card>

      <Card>
        <form method="get" action={PATH} className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center">
          <label htmlFor="items-q" className="sr-only">
            Search
          </label>
          <input
            id="items-q"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={150}
            placeholder="Investor, account or bank"
            className={`${fieldClass} w-full sm:w-72`}
          />
          <label htmlFor="items-format" className="sr-only">
            Bank file
          </label>
          <select id="items-format" name="format" defaultValue={format} className={fieldClass}>
            <option value="all">CBL and BEFTN</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {EXPORT_FORMAT[f].label} only
              </option>
            ))}
          </select>
          <label htmlFor="items-batch" className="sr-only">
            Batch
          </label>
          <select id="items-batch" name="batch" defaultValue={waiting ? 'none' : 'any'} className={fieldClass}>
            <option value="any">In a batch or not</option>
            <option value="none">Not in a batch</option>
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

        {!complete && (
          <div className="border-b border-hairline px-5 py-3">
            <Notice title="This list may be incomplete">
              There are too many payout items to read at once, so some that aren’t in a batch may be missing.
            </Notice>
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState
            title={waiting && !search && format === 'all' ? 'Every item is in a batch' : 'No payout items'}
            body={
              waiting && !search && format === 'all'
                ? 'Nothing is waiting. New items appear here after you prepare them.'
                : filtered
                  ? 'Try another search or filter.'
                  : 'Prepare payout items once the monthly profit has been calculated.'
            }
          />
        ) : (
          <Table
            minWidth={1080}
            head={
              <tr>
                <th className={th}>Investor</th>
                <th className={th}>Pays into</th>
                <th className={th}>For</th>
                <th className={thNum}>Amount</th>
                <th className={th}>Batch</th>
                <th className={th}>Prepared</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {items.map((i) => (
              <tr key={i.id}>
                <td className={td}>
                  <Link href={`/admin/investors/${i.investorId}`} className={linkClass}>
                    {i.investor.fullname}
                  </Link>
                  <span className="block text-xs leading-4 text-muted">{i.investor.user.email}</span>
                </td>
                <td className={td}>
                  {i.snapshotAccountName}
                  <span className="block text-xs leading-4 text-muted tabular-nums">{i.snapshotAccountNumber}</span>
                  <span className="block text-xs leading-4 text-muted">
                    {i.snapshotBankName} · {EXPORT_FORMAT[i.exportFormat].label}
                  </span>
                </td>
                <td className={td}>
                  {i.reason}
                  {i.investorNote && (
                    <span className="block text-xs leading-4 text-secondary">Investor: {i.investorNote}</span>
                  )}
                  {i.remarks && <span className="block text-xs leading-4 text-secondary">Staff: {i.remarks}</span>}
                </td>
                <td className={tdNum}>{formatTaka(i.amount)}</td>
                <td className={td}>
                  {i.batchId && i.batch ? (
                    <div className="flex flex-col items-start gap-1">
                      <Link href={`${PAYOUTS_PATH}/batches/${i.batchId}`} className={linkClass}>
                        {i.batch.slotLabel}
                      </Link>
                      <StatusBadge labels={BATCH_STATUS} status={i.isDisbursed ? 'confirmed' : i.batch.status} />
                    </div>
                  ) : (
                    <Badge tone="solid">Not in a batch</Badge>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(i.createdAt)}</td>
                <td className={`${td} text-right`}>
                  <ItemActions id={i.id} remarks={i.remarks} investorNote={i.investorNote} canRemove={false} />
                </td>
              </tr>
            ))}
          </Table>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['item', 'items']} />
      </Card>
    </>
  );
}
