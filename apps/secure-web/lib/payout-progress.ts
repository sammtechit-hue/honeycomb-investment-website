import { sumTaka } from './format';
import type { DisbursementPeriod, Investment, LedgerRow } from './investor';

// How an investor's profit moves towards their bank account, worked out from
// their own ledger rows (the only payout data the investor API returns).
//
// Each month's profit is a ledger row. When enough months have built up for
// the investment's payout schedule, staff put them into one payout (a
// "disbursement item") and send it to the bank in a batch. The rows are
// marked paid once the bank confirms the batch.

export type PayoutState = 'building' | 'being_paid' | 'paid';

export function payoutState(row: Pick<LedgerRow, 'payoutStatus' | 'disbursementItemId'>): PayoutState {
  if (row.payoutStatus === 'disbursed') return 'paid';
  return row.disbursementItemId ? 'being_paid' : 'building';
}

// Months per payout. Mirrors CYCLES_PER_DISBURSEMENT in
// apps/api/src/admin/disbursement-item/disbursement-item.service.ts.
export const MONTHS_PER_PAYOUT: Record<DisbursementPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

// One payout: the months that went (or are going) to the bank together.
export type Payout = {
  id: string;
  investmentId: string;
  cycleStart: string;
  cycleEnd: string;
  months: number;
  amount: number;
  paid: boolean;
};

// Newest first (by the last month covered).
export function groupPayouts(ledger: LedgerRow[]): Payout[] {
  const byItem = new Map<string, LedgerRow[]>();
  for (const r of ledger) {
    if (!r.disbursementItemId) continue;
    const rows = byItem.get(r.disbursementItemId) ?? [];
    rows.push(r);
    byItem.set(r.disbursementItemId, rows);
  }
  return [...byItem].map(([id, rows]) => {
    const starts = rows.map((r) => r.cycleStart).sort();
    const ends = rows.map((r) => r.cycleEnd).sort();
    return {
      id,
      investmentId: rows[0].investmentId,
      cycleStart: starts[0],
      cycleEnd: ends[ends.length - 1],
      months: rows.length,
      amount: sumTaka(rows.map((r) => r.profitAmount)),
      // Confirming a batch marks every row of its items paid together.
      paid: rows.every((r) => r.payoutStatus === 'disbursed'),
    };
  }).sort((a, b) => b.cycleEnd.localeCompare(a.cycleEnd));
}

// Where an active investment stands on its next payout.
export type NextPayout = {
  investment: Investment;
  // Months of profit not in a payout yet, and how many a payout needs.
  built: number;
  needed: number;
  builtAmount: number;
  // Already put into a payout, waiting for the bank.
  beingPaid: number;
  beingPaidAmount: number;
};

export function nextPayouts(investments: Investment[], ledger: LedgerRow[]): NextPayout[] {
  return investments
    .filter((i) => i.status === 'active')
    .map((investment) => {
      const rows = ledger.filter((r) => r.investmentId === investment.id);
      const building = rows.filter((r) => payoutState(r) === 'building');
      const beingPaid = rows.filter((r) => payoutState(r) === 'being_paid');
      return {
        investment,
        built: building.length,
        needed: MONTHS_PER_PAYOUT[investment.disbursementPeriod],
        builtAmount: sumTaka(building.map((r) => r.profitAmount)),
        beingPaid: beingPaid.length,
        beingPaidAmount: sumTaka(beingPaid.map((r) => r.profitAmount)),
      };
    });
}

// "1 month", "3 months".
export const months = (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`;

// What happens next for one investment, in a sentence.
export function nextPayoutText(p: Pick<NextPayout, 'built' | 'needed' | 'beingPaid'>): string {
  if (p.built >= p.needed) {
    return p.beingPaid > 0
      ? 'More profit is ready and goes into a later payout.'
      : 'Ready: it goes into the next payout window.';
  }
  if (p.built === 0) {
    return p.needed === 1
      ? 'Paid after each monthly cycle.'
      : `Paid once ${months(p.needed)} of profit have built up.`;
  }
  return `${p.built} of ${p.needed} months built up. Paid after ${months(p.needed - p.built)} more.`;
}
