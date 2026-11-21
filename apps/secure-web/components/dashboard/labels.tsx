import { formatRate } from '@/lib/format';
import type { DisbursementPeriod, Investment, InvestmentStatus, LedgerRow } from '@/lib/investor';
import { payoutState, type PayoutState } from '@/lib/payout-progress';
import { Badge, type BadgeTone } from './ui';

const INVESTMENT_STATUS: Record<InvestmentStatus, [string, BadgeTone]> = {
  pending: ['Pending review', 'muted'],
  active: ['Active', 'solid'],
  rejected: ['Rejected', 'outline'],
  closed: ['Closed', 'outline'],
};

export function InvestmentStatusBadge({ status }: { status: InvestmentStatus }) {
  const [label, tone] = INVESTMENT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const PAYMENT_STATUS = {
  pending: ['Payment pending', 'muted'],
  confirmed: ['Payment confirmed', 'outline'],
  overdue: ['Payment overdue', 'solid'],
} as const satisfies Record<NonNullable<Investment['incomingPayments']>['status'], [string, BadgeTone]>;

export function PaymentStatusBadge({ payment }: { payment: Investment['incomingPayments'] }) {
  if (!payment) return <Badge tone="outline">No payment yet</Badge>;
  const [label, tone] = PAYMENT_STATUS[payment.status];
  return <Badge tone={tone}>{label}</Badge>;
}

const PAYOUT_STATE: Record<PayoutState, [string, BadgeTone]> = {
  building: ['Awaiting payout', 'muted'],
  being_paid: ['Being paid', 'outline'],
  paid: ['Paid', 'solid'],
};

// Awaiting payout → Being paid (in a payout the team is sending) → Paid
// (the bank has confirmed it).
export function PayoutStatusBadge({ row }: { row: Pick<LedgerRow, 'payoutStatus' | 'disbursementItemId'> }) {
  const [label, tone] = PAYOUT_STATE[payoutState(row)];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PayoutBadge({ paid }: { paid: boolean }) {
  const [label, tone] = PAYOUT_STATE[paid ? 'paid' : 'being_paid'];
  return <Badge tone={tone}>{label}</Badge>;
}

const PERIOD_LABEL: Record<DisbursementPeriod, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

export function payoutLabel(period: DisbursementPeriod) {
  return PERIOD_LABEL[period];
}

export function rateLabel(investment: Pick<Investment, 'investmentType' | 'rate'>) {
  if (investment.investmentType === 'unfixed') return 'Variable, set monthly';
  return investment.rate ? `Fixed ${formatRate(investment.rate)} monthly` : 'Fixed monthly rate';
}
