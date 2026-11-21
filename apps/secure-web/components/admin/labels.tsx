import { Badge, type BadgeTone } from '@/components/dashboard/ui';
import type { EditRequestStatus, PaymentMethod, PaymentStatus, ProjectStatus, VerificationStatus } from '@/lib/admin';
import type { InvestmentStatus, InvestorStatus } from '@/lib/investor';
import type { BatchStatus, ExportFormat, PayoutWindowStatus } from '@/lib/payouts';
import type { CodeState } from '@/lib/referrals';

// Status wording and badge tone for every admin list. Option arrays double
// as the filter choices on each list page.

type Labels<T extends string> = Record<T, [string, BadgeTone]>;

export const INVESTOR_STATUS: Labels<InvestorStatus> = {
  pending: ['Not submitted', 'outline'],
  uploaded_kyc: ['Awaiting review', 'solid'],
  rejected: ['Sent back', 'outline'],
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

// Only OPEN projects take new investments.
export const PROJECT_STATUS: Labels<ProjectStatus> = {
  OPEN: ['Open', 'solid'],
  DRAFT: ['Draft', 'outline'],
  FULL: ['Full', 'muted'],
  PAUSED: ['Paused', 'outline'],
  COMPLETED: ['Completed', 'muted'],
  CANCELLED: ['Cancelled', 'outline'],
};

// Payouts. "Overdue" isn't a stored window status (see isOverdue).
export const PAYOUT_WINDOW_STATUS: Labels<PayoutWindowStatus> = {
  open: ['Open', 'solid'],
  completed: ['Completed', 'muted'],
};

export const BATCH_STATUS: Labels<BatchStatus> = {
  draft: ['Draft', 'outline'],
  exported: ['Sent to bank', 'solid'],
  confirmed: ['Paid', 'muted'],
};

export const EXPORT_FORMAT: Record<ExportFormat, { label: string; hint: string }> = {
  cbl: { label: 'CBL', hint: 'City Bank accounts' },
  beftn: { label: 'BEFTN', hint: 'Accounts at other banks' },
};

// Referral codes. "Replaced" = an older code the owner no longer uses.
export const REFERRAL_CODE_STATE: Labels<CodeState> = {
  available: ['Ready to use', 'solid'],
  used: ['Used', 'muted'],
  replaced: ['Replaced', 'outline'],
  expired: ['Expired', 'outline'],
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
