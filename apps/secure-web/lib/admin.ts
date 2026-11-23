import { redirect } from 'next/navigation';
import { sumTaka } from './format';
import type { DisbursementPeriod, InvestmentStatus, InvestorCategory, InvestorStatus } from './investor';
import { countLeadsToFollowUp } from './leads';
import { getAllUnbatchedItems, overdueWindowQuery } from './payouts';
import { getJson, getPage, type Page } from './server-api';
import { requireSessionUser, type SessionUser } from './session';

// Server-side reads for the admin panel. Shapes mirror the selects in
// apps/api/src/admin/*/…service.ts.

export type StaffRole = Exclude<SessionUser['role'], 'INVESTOR'>;

export const ROLE_LABEL: Record<StaffRole, string> = {
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

// Staff only: investors are sent to their own dashboard.
export async function requireStaff(returnTo: string): Promise<SessionUser & { role: StaffRole }> {
  const user = await requireSessionUser(returnTo);
  if (user.role === 'INVESTOR') redirect('/dashboard');
  return user as SessionUser & { role: StaffRole };
}

// ---------------------------------------------------------------------------
// Investors
// ---------------------------------------------------------------------------

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type PaymentStatus = 'pending' | 'confirmed' | 'overdue';
export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'bank_transfer';

export type AdminBankAccount = {
  id: string;
  selectedBank: 'city_bank' | 'others';
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string | null;
  accountType: 'savings' | 'current' | null;
  branchName: string | null;
  isActive: boolean;
};

export type AdminNominee = {
  nomineeName: string;
  nomineePhone: string | null;
  relation: string;
  nomineeNidNumber: string | null;
  nomineeNidFront: string | null;
  nomineeNidBack: string | null;
  nomineePhoto: string | null;
};

export type AdminKyc = {
  nidFront: string;
  nidBack: string;
  photo: string;
  verificationStatus: VerificationStatus;
  uploadedAt: string;
};

export type AdminInvestor = {
  id: string;
  userId: string;
  fullname: string;
  address: string | null;
  profession: string | null;
  workplace: string | null;
  nidNumber: string | null;
  category: InvestorCategory;
  status: InvestorStatus;
  totalInvestmentAmount: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { email: string; phone: string | null; lastLoginAt?: string | null };
  nominee: AdminNominee | null;
  kycDocuments: AdminKyc | null;
  bankAccount: AdminBankAccount[];
};

export function listInvestors(query: URLSearchParams, returnTo: string): Promise<Page<AdminInvestor>> {
  return getPage<AdminInvestor>('/admin/investor', query, returnTo);
}

export async function getInvestor(id: string, returnTo: string): Promise<AdminInvestor | null> {
  const res = await getJson<{ data: AdminInvestor }>(`/admin/investor/${id}`, returnTo);
  return res?.data ?? null;
}

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

export type AdminPaymentOnInvestment = {
  id: string;
  amount: string;
  paymentMethod: PaymentMethod;
  screenshotUrl: string;
  senderAccountInfo: string | null;
  confirmedAt: string | null;
  status: PaymentStatus;
  createdAt: string;
};

export type AdminInvestment = {
  id: string;
  investmentDate: string | null;
  amount: string;
  investmentType: 'fixed' | 'unfixed';
  rate: string | null;
  investmentPeriodMonths: number | null;
  disbursementPeriod: DisbursementPeriod;
  agreementPlace: string | null;
  agreementEndDate: string | null;
  status: InvestmentStatus;
  investorId: string;
  investor: { fullname: string };
  projectId: string;
  project: { name: string };
  createdAt: string;
  updatedAt: string;
  specialInstruction: string | null;
  incomingPayments: AdminPaymentOnInvestment | null;
};

export function listInvestments(query: URLSearchParams, returnTo: string): Promise<Page<AdminInvestment>> {
  return getPage<AdminInvestment>('/admin/investment', query, returnTo);
}

export async function getInvestment(id: string, returnTo: string): Promise<AdminInvestment | null> {
  const res = await getJson<{ data: AdminInvestment }>(`/admin/investment/${id}`, returnTo);
  return res?.data ?? null;
}

// ---------------------------------------------------------------------------
// Incoming payments
// ---------------------------------------------------------------------------

export type AdminPayment = AdminPaymentOnInvestment & {
  investmentId: string;
  investment: {
    amount: string;
    status: InvestmentStatus;
    investorId: string;
    investor: { fullname: string };
    projectId: string;
    project: { name: string };
  };
};

export function listPayments(query: URLSearchParams, returnTo: string): Promise<Page<AdminPayment>> {
  return getPage<AdminPayment>('/admin/incoming-payment', query, returnTo);
}

// ---------------------------------------------------------------------------
// Profile change requests
// ---------------------------------------------------------------------------

export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AdminEditRequestRow = {
  id: string;
  investorId: string;
  status: EditRequestStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  investor: { fullname: string; status: InvestorStatus; user: { email: string; phone: string | null } };
};

export function listEditRequests(query: URLSearchParams, returnTo: string): Promise<Page<AdminEditRequestRow>> {
  return getPage<AdminEditRequestRow>('/admin/investor/edit-requests', query, returnTo);
}

export type AdminEditRequestDetail = {
  investor: {
    id: string;
    fullname: string;
    status: InvestorStatus;
    user: { email: string; phone: string | null };
  };
  editRequest: {
    id: string;
    status: EditRequestStatus;
    reviewedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
  };
  pendingEdits: {
    investor: { address: string | null; profession: string | null; workplace: string | null } | null;
    nominee: {
      nomineeName: string | null;
      nomineePhone: string | null;
      relation: string | null;
      nomineeNidFront: string | null;
      nomineeNidBack: string | null;
      nomineePhoto: string | null;
    } | null;
    kycDocuments: { nidFront: string | null; nidBack: string | null; photo: string | null } | null;
    user: { email: string | null; phone: string | null; passwordGiven: boolean } | null;
  };
};

export async function getEditRequest(id: string, returnTo: string): Promise<AdminEditRequestDetail | null> {
  const res = await getJson<{ data: AdminEditRequestDetail }>(`/admin/investor/edit-requests/${id}`, returnTo);
  return res?.data ?? null;
}

// ---------------------------------------------------------------------------
// Work queues (overview)
// ---------------------------------------------------------------------------

async function countOf(path: string, filters: Record<string, string>, returnTo: string) {
  const page = await getPage<unknown>(path, new URLSearchParams({ ...filters, limit: '1' }), returnTo);
  return page.meta.total;
}

export async function getQueueCounts(returnTo: string) {
  const [
    awaitingVerification,
    pendingInvestments,
    pendingPayments,
    overduePayments,
    pendingChanges,
    unbatched,
    draftBatches,
    sentBatches,
    overdueWindows,
    allReferrals,
    recordedReferrals,
    leadsToFollowUp,
  ] = await Promise.all([
    countOf('/admin/investor', { status: 'uploaded_kyc' }, returnTo),
    countOf('/admin/investment', { status: 'pending' }, returnTo),
    countOf('/admin/incoming-payment', { status: 'pending' }, returnTo),
    countOf('/admin/incoming-payment', { status: 'overdue' }, returnTo),
    countOf('/admin/investor/edit-requests', { status: 'PENDING' }, returnTo),
    // No "not in a batch" filter: read the items and count here.
    getAllUnbatchedItems({}, returnTo),
    countOf('/admin/disbursement-batch', { status: 'draft' }, returnTo),
    countOf('/admin/disbursement-batch', { status: 'exported' }, returnTo),
    countOf('/admin/payout-window', overdueWindowQuery(), returnTo),
    // No "no bonus yet" filter: every referral minus those with an amount
    // (an amount range leaves out the empty ones).
    countOf('/admin/referral', {}, returnTo),
    countOf('/admin/referral', { minBonusAmount: '0' }, returnTo),
    // No "not followed up" filter either; see countLeadsToFollowUp.
    countLeadsToFollowUp(returnTo),
  ]);
  return {
    awaitingVerification,
    pendingInvestments,
    pendingPayments,
    overduePayments,
    pendingChanges,
    unbatchedItems: {
      count: unbatched.rows.length,
      amount: sumTaka(unbatched.rows.map((i) => i.amount)),
      complete: unbatched.complete,
    },
    draftBatches,
    sentBatches,
    overdueWindows,
    unrecordedBonuses: Math.max(0, allReferrals - recordedReferrals),
    leadsToFollowUp,
  };
}

// Changing projects, rates and settings is for admins; moderators can look.
// (The API enforces the same split; SUPER_ADMIN passes every role check.)
export function canManage(role: StaffRole) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectStatus = 'DRAFT' | 'OPEN' | 'FULL' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type AdminProject = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  // Fixed monthly rate (%) for this project's fixed-rate investments.
  projectRate: string | null;
  minimumInvestment: string;
  maximumInvestment: string | null;
  targetAmount: string | null;
  totalInvestedAmount: string;
  totalActiveInvestmentAmout: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export function listProjects(query: URLSearchParams, returnTo: string): Promise<Page<AdminProject>> {
  return getPage<AdminProject>('/admin/project', query, returnTo);
}

export async function getProject(id: string, returnTo: string): Promise<AdminProject | null> {
  const res = await getJson<{ data: AdminProject }>(`/admin/project/${id}`, returnTo);
  return res?.data ?? null;
}

// Every project, for pickers (rates). The API caps a page at 100.
export async function listAllProjects(returnTo: string): Promise<AdminProject[]> {
  const rows: AdminProject[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await listProjects(
      new URLSearchParams({ page: String(page), limit: '100', sortBy: 'name', sortOrder: 'asc' }),
      returnTo,
    );
    rows.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return rows;
}

export async function countProjectInvestments(projectId: string, returnTo: string) {
  return countOf('/admin/investment', { projectId }, returnTo);
}

// ---------------------------------------------------------------------------
// Monthly rates (variable-rate investments, per project per month)
// ---------------------------------------------------------------------------

export type AdminMonthlyRate = {
  id: string;
  // First day of the month, UTC.
  periodMonth: string;
  ratePercent: string;
  isActive: boolean;
  setAt: string;
  projectId: string;
  project: { id: string; name: string };
};

export function listMonthlyRates(query: URLSearchParams, returnTo: string): Promise<Page<AdminMonthlyRate>> {
  return getPage<AdminMonthlyRate>('/admin/monthly-rate-setting', query, returnTo);
}

// ---------------------------------------------------------------------------
// Business settings (profit cycle)
// ---------------------------------------------------------------------------

export type AdminBusinessSettings = {
  id: number;
  rate: string | null;
  setcycleday: number | null;
  countingStartAfterDays: number | null;
  label: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// The row the profit run reads: the first active one.
export async function getActiveBusinessSettings(returnTo: string): Promise<AdminBusinessSettings | null> {
  const page = await getPage<AdminBusinessSettings>(
    '/admin/business-settings',
    new URLSearchParams({ isActive: 'true', limit: '10', sortBy: 'createdAt', sortOrder: 'asc' }),
    returnTo,
  );
  return page.data[0] ?? null;
}

// Whether investors can put money into the project right now — the same
// checks the API makes before accepting an application or investment.
export function acceptingNow(p: Pick<AdminProject, 'status' | 'isActive' | 'isVisible' | 'startDate' | 'endDate'>) {
  const now = Date.now();
  return (
    p.status === 'OPEN' &&
    p.isActive &&
    p.isVisible &&
    new Date(p.startDate).getTime() <= now &&
    (!p.endDate || new Date(p.endDate).getTime() >= now)
  );
}
