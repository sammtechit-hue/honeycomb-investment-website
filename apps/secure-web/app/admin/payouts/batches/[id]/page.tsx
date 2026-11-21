import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/admin/action-button';
import { BATCH_STATUS, EXPORT_FORMAT, StatusBadge } from '@/components/admin/labels';
import { secondaryButtonClass } from '@/components/dashboard/form';
import { Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { canManage, requireStaff } from '@/lib/admin';
import { formatDate, formatTaka, sumTaka } from '@/lib/format';
import { getBatch, getBatchItems, getUnbatchedItems, listAllPayoutWindows } from '@/lib/payouts';
import { HistoryLink } from '../../../audit/ui';
import { AddItemsForm, ItemActions } from '../../batch-forms';
import { Details, PAYOUTS_PATH, UUID_RE, linkClass, windowName } from '../../ui';

export const metadata: Metadata = {
  title: 'Payout batch · HoneyComb Admin',
};

export default async function PayoutBatchPage(props: PageProps<'/admin/payouts/batches/[id]'>) {
  const { id } = await props.params;
  const returnTo = `${PAYOUTS_PATH}/batches/${id}`;
  const user = await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();

  const batch = await getBatch(id, returnTo);
  if (!batch) notFound();

  const draft = batch.status === 'draft';
  const [windows, items, candidates] = await Promise.all([
    listAllPayoutWindows(returnTo),
    getBatchItems(id, returnTo),
    draft ? getUnbatchedItems(batch.exportType, returnTo) : Promise.resolve(null),
  ]);
  const pw = windows.find((w) => w.id === batch.windowId) ?? null;
  const rows = items.rows;
  const total = sumTaka(rows.map((i) => i.amount));
  const wrongFormat = rows.filter((i) => i.exportFormat !== batch.exportType);
  const format = EXPORT_FORMAT[batch.exportType];
  const endpoint = `/api/admin/disbursement-batch/${id}`;
  const fileHref = `${returnTo}/export`;
  // Same checks the export route makes before it builds the file.
  const fileProblem =
    rows.length === 0
      ? 'Add at least one item to download the file.'
      : !items.complete
        ? 'The file can’t be made until every item loads.'
        : wrongFormat.length > 0
          ? 'Remove the items that belong in the other kind of file to download it.'
          : null;
  const fileLink = (label: string) =>
    fileProblem ? (
      <p className="text-sm leading-5 text-muted">{fileProblem}</p>
    ) : (
      <a href={fileHref} className={secondaryButtonClass} download>
        {label}
      </a>
    );
  const windowHref = `${PAYOUTS_PATH}/windows/${batch.windowId}`;

  return (
    <>
      <p className="text-sm leading-5">
        <Link href={windowHref} className="text-muted underline decoration-rule underline-offset-2 hover:text-ink">
          ← {pw ? windowName(pw) : 'Payout window'}
        </Link>
      </p>
      <PageHeader
        eyebrow={`${format.label} batch`}
        title={batch.slotLabel}
        description={`${format.hint}. The bank pays on ${formatDate(batch.batchDate)}.`}
        actions={
          <>
            <StatusBadge labels={BATCH_STATUS} status={batch.status} />
            <HistoryLink role={user.role} targetId={batch.id} />
          </>
        }
      />

      {!items.complete && (
        <Notice title="Not every item could be loaded">
          This batch has more items than the page can read at once. Don’t send its file to the bank until this is
          fixed.
        </Notice>
      )}
      {wrongFormat.length > 0 && (
        <Notice title={`${wrongFormat.length} ${wrongFormat.length === 1 ? 'item doesn’t' : 'items don’t'} belong in a ${format.label} file`}>
          {wrongFormat.length === 1 ? 'It pays' : 'They pay'} into{' '}
          {batch.exportType === 'cbl' ? 'an account at another bank' : 'a City Bank account'}.{' '}
          {draft ? 'Remove it from this batch and add it to a batch of the right kind.' : 'Check the bank file before it’s paid.'}
        </Notice>
      )}

      <Card title="Details">
        <Details
          items={[
            ['Window', pw ? <Link href={windowHref} className={linkClass}>{windowName(pw)}</Link> : '—'],
            ['Bank file', `${format.label} (${format.hint})`],
            ['Bank payment date', formatDate(batch.batchDate)],
            ['Items', String(rows.length)],
            ['Total', formatTaka(total)],
            ['Created', formatDate(batch.createdAt)],
          ]}
        />
      </Card>

      <Card
        title="What happens next"
        description="Draft → sent to bank → paid. A batch can’t go back a step."
      >
        <div className="flex flex-col gap-5 p-5">
          {batch.status === 'draft' && (
            <>
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-5 text-secondary">
                <li>Add the payout items below.</li>
                <li>Download the bank file and upload it to the bank.</li>
                <li>Mark the batch as sent. Its items are then fixed.</li>
              </ol>
              <div className="flex flex-wrap items-start gap-3">
                {fileLink('Download bank file')}
                {!fileProblem && (
                  <ActionButton
                      endpoint={endpoint}
                      body={{ status: 'exported' }}
                      label="Mark as sent to bank"
                    confirm="Items can’t be added or removed after this."
                  />
                )}
              </div>
            </>
          )}

          {batch.status === 'exported' && (
            <>
              <p className="text-sm leading-5 text-secondary">
                Once the bank has paid every item, confirm the payment. That marks each item and the profit behind it
                as paid.
              </p>
              <div className="flex flex-wrap items-start gap-3">
                {fileLink('Download bank file again')}
                <ActionButton
                  endpoint={endpoint}
                  body={{ status: 'confirmed' }}
                  label="Confirm payment"
                  pendingLabel="Confirming…"
                  confirm="Marks all of it as paid. This can’t be undone."
                />
              </div>
            </>
          )}

          {batch.status === 'confirmed' && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm leading-5 text-secondary">Paid. This batch can’t change any more.</p>
              {fileLink('Download bank file')}
            </div>
          )}

          {draft && canManage(user.role) && (
            <div className="flex flex-col gap-2 border-t border-hairline pt-5">
              <p className="text-sm leading-5 text-muted">
                A draft batch can be deleted.
                {rows.length > 0 && ' Its items aren’t deleted: they go back to the items waiting for a batch.'}
              </p>
              <div className="self-start">
                <ActionButton
                  endpoint={endpoint}
                  body={{}}
                  method="DELETE"
                  label="Delete batch"
                  pendingLabel="Deleting…"
                  confirm="This can’t be undone."
                  variant="secondary"
                  redirectTo={windowHref}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Items in this batch" description="Bank details as they were when each item was prepared.">
        {rows.length === 0 ? (
          <EmptyState title="No items yet" body={draft ? 'Add payout items from the list below.' : 'This batch has no items.'} />
        ) : (
          <Table
            minWidth={1040}
            head={
              <tr>
                <th className={th}>Investor</th>
                <th className={th}>Pays into</th>
                <th className={th}>For</th>
                <th className={th}>Notes</th>
                <th className={thNum}>Amount</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {rows.map((i) => (
              <tr key={i.id}>
                <td className={td}>
                  <Link href={`/admin/investors/${i.investorId}`} className={linkClass}>
                    {i.investor.fullname}
                  </Link>
                  <Link
                    href={`/admin/investments/${i.investmentId}`}
                    className="block text-xs leading-4 text-muted underline decoration-rule underline-offset-2"
                  >
                    Investment of {formatTaka(i.investment.amount)}
                  </Link>
                </td>
                <td className={td}>
                  {i.snapshotAccountName}
                  <span className="block text-xs leading-4 text-muted tabular-nums">
                    {i.snapshotAccountNumber}
                    {i.snapshotAccountType ? ` · ${i.snapshotAccountType}` : ''}
                  </span>
                  <span className="block text-xs leading-4 text-muted">
                    {i.snapshotBankName}
                    {i.snapshotBranchName ? `, ${i.snapshotBranchName}` : ''}
                    {i.snapshotRoutingNumber ? ` · routing ${i.snapshotRoutingNumber}` : ''}
                  </span>
                  {i.exportFormat !== batch.exportType && (
                    <span className="block text-xs leading-4 font-semibold text-ink">
                      {EXPORT_FORMAT[i.exportFormat].label} item
                    </span>
                  )}
                </td>
                <td className={td}>{i.reason}</td>
                <td className={td}>
                  {i.remarks || i.investorNote ? (
                    <>
                      {i.remarks && <span className="block text-xs leading-4 text-secondary">Staff: {i.remarks}</span>}
                      {i.investorNote && (
                        <span className="block text-xs leading-4 text-secondary">Investor: {i.investorNote}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className={tdNum}>{formatTaka(i.amount)}</td>
                <td className={`${td} text-right`}>
                  <ItemActions id={i.id} remarks={i.remarks} investorNote={i.investorNote} canRemove={draft} />
                </td>
              </tr>
            ))}
          </Table>
        )}
        {rows.length > 0 && (
          <div className="flex justify-end border-t border-hairline px-5 py-3 text-sm leading-5 font-semibold text-ink tabular-nums">
            Total {formatTaka(total)}
          </div>
        )}
      </Card>

      {candidates && (
        <Card
          title={`Add ${format.label} items`}
          description={`Prepared payout items that aren’t in a batch yet and pay into ${format.hint.toLowerCase()}.`}
        >
          {!candidates.complete && (
            <div className="px-5 pt-4">
              <Notice title="Not every item could be loaded">Some items may be missing from this list.</Notice>
            </div>
          )}
          {candidates.rows.length === 0 ? (
            <EmptyState
              title="Nothing to add"
              body="Every prepared item of this kind is already in a batch."
              action={
                <Link href={`${PAYOUTS_PATH}/items`} className={secondaryButtonClass}>
                  Prepare payout items
                </Link>
              }
            />
          ) : (
            <AddItemsForm
              batchId={batch.id}
              items={candidates.rows.map((i) => ({
                id: i.id,
                investorName: i.investor.fullname,
                accountName: i.snapshotAccountName,
                accountNumber: i.snapshotAccountNumber,
                bankName: i.snapshotBankName,
                reason: i.reason,
                amount: i.amount,
              }))}
            />
          )}
        </Card>
      )}
    </>
  );
}
