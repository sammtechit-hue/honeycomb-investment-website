import { formatRate } from '@/lib/format';
import type { DisbursementPeriod, Investment, InvestmentStatus, LedgerRow } from '@/lib/investor';
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

// "Sent" once the row's payout batch is marked sent; until then the profit
// is calculated and waiting for its payout window.
export function PayoutStatusBadge({ status }: { status: LedgerRow['payoutStatus'] }) {
  return status === 'disbursed' ? <Badge tone="solid">Sent</Badge> : <Badge>Awaiting payout</Badge>;
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
