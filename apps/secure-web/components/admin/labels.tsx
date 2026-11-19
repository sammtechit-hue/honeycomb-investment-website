import { Badge, type BadgeTone } from '@/components/dashboard/ui';
import type { EditRequestStatus, PaymentMethod, PaymentStatus, VerificationStatus } from '@/lib/admin';
import type { InvestmentStatus, InvestorStatus } from '@/lib/investor';

// Status wording and badge tone for every admin list. Option arrays double
// as the filter choices on each list page.

type Labels<T extends string> = Record<T, [string, BadgeTone]>;

export const INVESTOR_STATUS: Labels<InvestorStatus> = {
  pending: ['Not submitted', 'outline'],
  uploaded_kyc: ['Awaiting review', 'solid'],
  active: ['Active', 'muted'],
  suspended: ['Suspended', 'outline'],
  deactivated: ['Deactivated', 'outline'],
};

export const KYC_STATUS: Labels<VerificationStatus> = {
  pending: ['Documents to review', 'muted'],
  verified: ['Documents verified', 'muted'],
  rejected: ['Documents rejected', 'outline'],
};

export const INVESTMENT_STATUS: Labels<InvestmentStatus> = {
  pending: ['Pending', 'solid'],
  active: ['Active', 'muted'],
  rejected: ['Rejected', 'outline'],
  closed: ['Closed', 'outline'],
};

export const PAYMENT_STATUS: Labels<PaymentStatus> = {
  pending: ['To confirm', 'solid'],
  confirmed: ['Confirmed', 'muted'],
  overdue: ['Overdue', 'outline'],
};

export const EDIT_REQUEST_STATUS: Labels<EditRequestStatus> = {
  PENDING: ['To review', 'solid'],
  APPROVED: ['Approved', 'muted'],
  REJECTED: ['Rejected', 'outline'],
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
};

export function StatusBadge<T extends string>({ labels, status }: { labels: Labels<T>; status: T }) {
  const [label, tone] = labels[status] ?? [status, 'outline'];
  return <Badge tone={tone}>{label}</Badge>;
}

export function optionsOf<T extends string>(labels: Labels<T>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value][0] }));
}
