import { getJson, getPage, type Page } from './server-api';

// Server-side reads for the audit log (admins only; the API refuses
// moderators). Shapes mirror apps/api/src/admin/audit-log/audit-log.service.ts,
// which returns whole rows.

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type AuditEntry = {
  id: number;
  adminName: string | null;
  adminProfileId: string | null;
  action: AuditAction;
  module: string | null;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  targetLabel: string | null;
  targetTable: string;
  targetId: string;
  oldValue: Json | null;
  newValue: Json | null;
  metadata: Json | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  statement: string | null;
  createdAt: string;
};

// Every action in the Prisma `AuditAction` enum (and `auditActionSchema` in
// packages/contracts/src/auditLog.ts, which the API's filter checks),
// grouped for the filter.
export const ACTION_GROUPS = [
  {
    label: 'Investors',
    actions: {
      investor_registered: 'Investor registered',
      investor_kyc_uploaded: 'KYC documents uploaded',
      investor_kyc_status_changed: 'KYC status changed',
      investor_status_changed: 'Investor status changed',
      investor_verified: 'Investor approved',
      investor_information_updated: 'Investor details changed',
    },
  },
  {
    label: 'Investments and payments',
    actions: {
      investment_created: 'Investment created',
      investment_status_changed: 'Investment status changed',
      incoming_payment_updated: 'Payment changed',
      withdrawal_status_changed: 'Withdrawal status changed',
    },
  },
  {
    label: 'Projects, rates and settings',
    actions: {
      project_created: 'Project created',
      project_updated: 'Project changed',
      project_deleted: 'Project deleted',
      monthly_rate_set: 'Monthly rate set',
      monthly_rate_updated: 'Monthly rate changed',
      business_settings_set: 'Profit settings created',
      business_settings_updated: 'Profit settings changed',
      company_document_uploaded: 'Company document uploaded',
    },
  },
  {
    label: 'Payouts',
    actions: {
      payout_window_created: 'Payout window opened',
      payout_window_updated: 'Payout window changed',
      disbursement_batch_created: 'Batch created',
      disbursement_batch_updated: 'Batch changed',
      disbursement_batch_exported: 'Batch sent to bank',
      disbursement_batch_confirmed: 'Batch confirmed as paid',
      disbursement_batch_deleted: 'Batch deleted',
      disbursement_item_remark_updated: 'Payout item notes changed',
    },
  },
  {
    label: 'Referrals',
    actions: {
      referral_code_generated: 'Referral code issued',
      referral_code_updated: 'Referral code changed',
      referral_updated: 'Referral bonus changed',
    },
  },
  {
    label: 'Staff accounts',
    actions: {
      admin_login: 'Signed in',
      admin_login_failed: 'Sign-in failed',
      admin_password_reset: 'Password reset',
      admin_invite_accepted: 'Invite accepted',
      admin_created: 'Staff account created',
      admin_invite_resent: 'Invite resent',
    },
  },
] as const;

type ActionsOf<G> = G extends { actions: infer A } ? keyof A & string : never;
export type AuditAction = ActionsOf<(typeof ACTION_GROUPS)[number]>;

const ACTION_LABEL: Record<string, string> = Object.assign({}, ...ACTION_GROUPS.map((g) => g.actions));

export function actionLabel(action: string) {
  return ACTION_LABEL[action] ?? action.replace(/_/g, ' ');
}

export function isAuditAction(v: string | undefined): v is AuditAction {
  return !!v && Object.hasOwn(ACTION_LABEL, v);
}

// What each kind of record is called, and where it lives in the admin panel.
const TARGETS: Record<string, { label: string; href?: (id: string) => string }> = {
  investors: { label: 'Investor', href: (id) => `/admin/investors/${id}` },
  investor_edit_requests: { label: 'Change request', href: (id) => `/admin/change-requests/${id}` },
  investor_bank_accounts: { label: 'Bank account' },
  investments: { label: 'Investment', href: (id) => `/admin/investments/${id}` },
  incoming_payments: { label: 'Payment' },
  projects: { label: 'Project', href: (id) => `/admin/projects/${id}` },
  monthly_rate_settings: { label: 'Monthly rate', href: () => '/admin/rates' },
  BusinessSettings: { label: 'Profit settings', href: () => '/admin/settings' },
  PayoutWindow: { label: 'Payout window', href: (id) => `/admin/payouts/windows/${id}` },
  disbursement_batches: { label: 'Batch', href: (id) => `/admin/payouts/batches/${id}` },
  disbursement_items: { label: 'Payout item' },
  referrals: { label: 'Referral', href: () => '/admin/referrals' },
  referral_codes: { label: 'Referral code', href: () => '/admin/referrals/codes' },
  users: { label: 'Staff account' },
};

export const TARGET_TABLES = Object.keys(TARGETS);

export function targetKind(table: string) {
  return TARGETS[table]?.label ?? table;
}

// A link to the record, unless it was deleted (the page would 404).
export function targetHref(entry: Pick<AuditEntry, 'action' | 'targetTable' | 'targetId'>) {
  if (entry.action.endsWith('_deleted')) return null;
  return TARGETS[entry.targetTable]?.href?.(entry.targetId) ?? null;
}

// The API's labels start with what happened ("Project Updated: Riverside
// Farms"); the action column already says that, so show the name only.
export function targetName(entry: Pick<AuditEntry, 'targetLabel' | 'targetId'>) {
  const label = entry.targetLabel?.trim();
  if (!label) return entry.targetId;
  const colon = label.indexOf(': ');
  return colon > 0 && colon < 50 ? label.slice(colon + 2) : label;
}

export function listAudit(query: URLSearchParams, returnTo: string): Promise<Page<AuditEntry>> {
  return getPage<AuditEntry>('/admin/audit-log', query, returnTo);
}

export async function getAuditEntry(id: number, returnTo: string): Promise<AuditEntry | null> {
  return (await getJson<{ data: AuditEntry }>(`/admin/audit-log/${id}`, returnTo))?.data ?? null;
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

export type FieldChange = { field: string; before: string | null; after: string | null; changed: boolean };

// Nested values flattened to dotted paths ("nominee.relation"); arrays are
// kept whole. Depth-limited so an odd payload can't run away.
function flatten(value: Json | null, prefix: string, out: Map<string, string | null>, depth: number) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && depth < 5) {
    const keys = Object.keys(value);
    if (keys.length === 0 && prefix) out.set(prefix, '{}');
    for (const k of keys) flatten(value[k], prefix ? `${prefix}.${k}` : k, out, depth + 1);
    return;
  }
  out.set(prefix || 'value', value === null ? null : typeof value === 'string' ? value : JSON.stringify(value));
}

// Before and after, field by field. Changed fields first, then the rest,
// each in the order they first appear.
export function fieldChanges(oldValue: Json | null, newValue: Json | null): FieldChange[] {
  const before = new Map<string, string | null>();
  const after = new Map<string, string | null>();
  if (oldValue != null) flatten(oldValue, '', before, 0);
  if (newValue != null) flatten(newValue, '', after, 0);
  const fields = [...new Set([...before.keys(), ...after.keys()])];
  const rows = fields.map((field) => {
    const b = before.has(field) ? before.get(field)! : null;
    const a = after.has(field) ? after.get(field)! : null;
    // A field only on one side counts as changed when the entry has both.
    const changed = oldValue != null && newValue != null ? b !== a : false;
    return { field, before: b, after: a, changed };
  });
  return [...rows.filter((r) => r.changed), ...rows.filter((r) => !r.changed)];
}
