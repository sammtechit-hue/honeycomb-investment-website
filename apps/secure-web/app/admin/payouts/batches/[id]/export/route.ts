import type { NextRequest } from 'next/server';
import { requireStaff } from '@/lib/admin';
import { getBatch, getBatchItems, type DisbursementItem } from '@/lib/payouts';

// GET /admin/payouts/batches/:id/export — the batch's payment list as CSV,
// for uploading to the bank.
//
// The API doesn't build bank files yet, so this does, from the same item
// rows the batch page shows. The columns are a general payment list; check
// them against the bank's CBL / BEFTN upload template before relying on it
// (see docs/backend-requests.md).
//
// It refuses rather than hand over a file that's wrong: one with missing
// items, or items that pay into the other kind of account.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNS: [string, (i: DisbursementItem, n: number) => string][] = [
  ['SL', (_, n) => String(n)],
  ['Beneficiary Name', (i) => i.snapshotAccountName],
  ['Account Number', (i) => i.snapshotAccountNumber],
  ['Account Type', (i) => i.snapshotAccountType ?? ''],
  ['Bank Name', (i) => i.snapshotBankName],
  ['Branch Name', (i) => i.snapshotBranchName ?? ''],
  ['Routing Number', (i) => i.snapshotRoutingNumber ?? ''],
  ['Amount (BDT)', (i) => Number(i.amount).toFixed(2)],
  ['Narration', (i) => i.reason],
  ['Investor', (i) => i.investor.fullname],
  ['Reference', (i) => i.id],
];

// Quote every cell, and stop a spreadsheet reading a name like "=SUM(…)" as
// a formula.
function cell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function refuse(status: number, message: string) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function GET(_request: NextRequest, ctx: RouteContext<'/admin/payouts/batches/[id]/export'>) {
  const { id } = await ctx.params;
  const returnTo = `/admin/payouts/batches/${id}`;
  await requireStaff(`${returnTo}/export`);
  if (!UUID_RE.test(id)) return refuse(404, 'Batch not found.');

  const batch = await getBatch(id, returnTo);
  if (!batch) return refuse(404, 'Batch not found.');

  const { rows, complete } = await getBatchItems(id, returnTo);
  if (!complete) return refuse(409, 'Not every item in this batch could be loaded, so no file was made.');
  if (rows.length === 0) return refuse(409, 'This batch has no items yet.');
  const wrong = rows.filter((i) => i.exportFormat !== batch.exportType);
  if (wrong.length > 0) {
    return refuse(
      409,
      `${wrong.length} item(s) in this batch pay into the other kind of account. Remove them from the batch first.`,
    );
  }

  const lines = [
    COLUMNS.map(([name]) => cell(name)).join(','),
    ...rows.map((item, index) => COLUMNS.map(([, value]) => cell(value(item, index + 1))).join(',')),
  ];
  // BOM so Excel opens Bangla names as UTF-8; CRLF line ends for bank portals.
  const body = `﻿${lines.join('\r\n')}\r\n`;

  const slug = batch.slotLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `payout-${batch.exportType}-${batch.batchDate.slice(0, 10)}-${slug || 'batch'}.csv`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
