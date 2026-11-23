import { getEvery, getPage, type Page } from './server-api';

// Server-side reads for the payout screens. Shapes mirror
// apps/api/src/admin/{payout-window,disbursement-batch,disbursement-item}.
//
// How a payout runs:
// 1. An admin opens a payout window (the dates money goes out for a month).
// 2. Staff prepare payout items: one per investment whose profit is due,
//    with the investor's bank details copied at that moment.
// 3. Staff create a batch in the window (CBL for City Bank accounts, BEFTN
//    for every other bank) and add items of the same kind to it.
// 4. They download the bank file and mark the batch exported.
// 5. Once the bank has paid, they confirm the batch. That marks its items and
//    the profit behind them as paid. It can't be undone.

export type PayoutWindowStatus = 'open' | 'completed';
export type BatchStatus = 'draft' | 'exported' | 'confirmed';
export type ExportFormat = 'cbl' | 'beftn';

export type PayoutWindow = {
  id: string;
  // First day of the month the window pays for (UTC midnight, date-only).
  periodMonth: string;
  monthLabel: string;
  yearLabel: number;
  startDate: string;
  endDate: string;
  status: PayoutWindowStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// The batch list includes each batch's items as plain rows (no investor).
export type BatchItemRow = {
  id: string;
  amount: string;
  exportFormat: ExportFormat;
  isDisbursed: boolean;
  batchId: string | null;
};

export type DisbursementBatch = {
  id: string;
  slotLabel: string;
  batchDate: string;
  exportType: ExportFormat;
  fileUrl: string | null;
  status: BatchStatus;
  createdAt: string;
  windowId: string;
  items: BatchItemRow[];
};

export type DisbursementItem = {
  id: string;
  reason: string;
  amount: string;
  exportFormat: ExportFormat;
  remarks: string | null;
  investorNote: string | null;
  isDisbursed: boolean;
  type: 'roi' | 'principal_withdrawal' | 'referral_bonus';
  investmentId: string;
  investorId: string;
  batchId: string | null;
  snapshotBankName: string;
  snapshotAccountName: string;
  snapshotAccountNumber: string;
  snapshotRoutingNumber: string | null;
  snapshotAccountType: string | null;
  snapshotBranchName: string | null;
  createdAt: string;
  investor: { fullname: string; status: string; user: { email: string; phone: string | null } };
  investment: { amount: string; status: string };
  batch: { slotLabel: string; batchDate: string; status: BatchStatus } | null;
};

// ---------------------------------------------------------------------------
// Payout windows
// ---------------------------------------------------------------------------

export function listPayoutWindows(query: URLSearchParams, returnTo: string): Promise<Page<PayoutWindow>> {
  return getPage<PayoutWindow>('/admin/payout-window', query, returnTo);
}

export async function listAllPayoutWindows(returnTo: string): Promise<PayoutWindow[]> {
  const { rows } = await getEvery<PayoutWindow>(
    '/admin/payout-window',
    { sortBy: 'periodMonth', sortOrder: 'desc' },
    returnTo,
  );
  return rows;
}

// There's no GET /admin/payout-window/:id yet, so find it in the list.
export async function getPayoutWindow(id: string, returnTo: string): Promise<PayoutWindow | null> {
  return (await listAllPayoutWindows(returnTo)).find((w) => w.id === id) ?? null;
}

// A calendar date in Bangladesh ("2026-11-21"), `offsetDays` from today.
export function dhakaDate(offsetDays = 0) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// "Overdue" isn't stored: an open window whose end date has passed (Dhaka).
export function isOverdue(w: Pick<PayoutWindow, 'status' | 'endDate'>) {
  return w.status === 'open' && w.endDate.slice(0, 10) < dhakaDate();
}

// The same rule as a list query: open, last payout day yesterday or earlier.
// (End dates are date-only, so "on or before yesterday" is "before today".)
export function overdueWindowQuery(): Record<string, string> {
  return { status: 'open', endDateTo: dhakaDate(-1) };
}

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

// The batch list can't filter by window or id yet, so read every batch and
// filter here.
export async function listAllBatches(returnTo: string): Promise<DisbursementBatch[]> {
  const { rows } = await getEvery<DisbursementBatch>(
    '/admin/disbursement-batch',
    { sortBy: 'createdAt', sortOrder: 'desc' },
    returnTo,
  );
  return rows;
}

export async function getBatch(id: string, returnTo: string): Promise<DisbursementBatch | null> {
  return (await listAllBatches(returnTo)).find((b) => b.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Payout items
// ---------------------------------------------------------------------------

export function listPayoutItems(query: URLSearchParams, returnTo: string): Promise<Page<DisbursementItem>> {
  return getPage<DisbursementItem>('/admin/disbursement-item', query, returnTo);
}

// Every item in one batch, in a stable order (for the table and the file).
export function getBatchItems(batchId: string, returnTo: string) {
  return getEvery<DisbursementItem>(
    '/admin/disbursement-item',
    { batchId, sortBy: 'createdAt', sortOrder: 'asc' },
    returnTo,
  );
}

const waitingForBatch = (i: DisbursementItem) => i.batchId === null && !i.isDisbursed;

// Items not yet in any batch, of one kind. The API can't filter on "no
// batch", so read every item of that kind and filter here.
export async function getUnbatchedItems(format: ExportFormat, returnTo: string) {
  const { rows, complete } = await getEvery<DisbursementItem>(
    '/admin/disbursement-item',
    { exportFormat: format, sortBy: 'createdAt', sortOrder: 'asc' },
    returnTo,
  );
  return { rows: rows.filter(waitingForBatch), complete };
}

// The same, across both bank files, with the item list's search and format
// filters (newest first, like the list).
export async function getAllUnbatchedItems(
  filters: { search?: string; format?: ExportFormat },
  returnTo: string,
) {
  const { rows, complete } = await getEvery<DisbursementItem>(
    '/admin/disbursement-item',
    {
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...(filters.search && { search: filters.search }),
      ...(filters.format && { exportFormat: filters.format }),
    },
    returnTo,
  );
  return { rows: rows.filter(waitingForBatch), complete };
}
