import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getAll, getJson, type Page } from './server-api';
import { requireSessionUser, type SessionUser } from './session';

// Server-side reads for the investor dashboard. Only endpoints that the
// API scopes to the signed-in investor are used here.

export type InvestorStatus = 'pending' | 'uploaded_kyc' | 'active' | 'suspended' | 'deactivated';
export type InvestorCategory = 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum' | 'titanium';

export type InvestorProfile = {
  id: string;
  fullname: string;
  address: string | null;
  profession: string | null;
  workplace: string | null;
  // Hidden by the API until verification is complete.
  category?: InvestorCategory;
  status: InvestorStatus;
  totalInvestmentAmount: string;
  approvedAt: string | null;
  createdAt: string;
  user: { email: string; phone: string | null; lastLoginAt: string | null };
  kycDocuments: { verificationStatus: 'pending' | 'verified' | 'rejected'; uploadedAt: string } | null;
  bankAccount: {
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    accountType: 'savings' | 'current' | null;
    branchName: string | null;
    isActive: boolean;
  }[];
  nominee: { nomineeName: string; nomineePhone: string | null; relation: string } | null;
};

export type InvestmentStatus = 'pending' | 'active' | 'rejected' | 'closed';
export type DisbursementPeriod = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export type Investment = {
  id: string;
  projectId: string;
  project: { name: string };
  amount: string;
  rate: string | null;
  investmentType: 'fixed' | 'unfixed';
  investmentPeriodMonths: number | null;
  disbursementPeriod: DisbursementPeriod;
  status: InvestmentStatus;
  investmentDate: string | null;
  agreementEndDate: string | null;
  incomingPayments: {
    amount: string;
    paymentMethod: string;
    status: 'pending' | 'confirmed' | 'overdue';
    confirmedAt: string | null;
  } | null;
};

export type LedgerRow = {
  id: string;
  cycleStart: string;
  cycleEnd: string;
  daysCounted: number;
  rateApplied: string;
  profitAmount: string;
  principalAmount: string;
  payoutStatus: 'accrued' | 'disbursed';
  investmentId: string;
};

// cache() lets the layout and the page share one fetch per request.
const getProfile = cache((returnTo: string) => getJson<InvestorProfile>('/investor', returnTo));

export const getInvestments = cache((returnTo: string) =>
  getAll<Investment>('/investment', 'sortBy=createdAt&sortOrder=desc', returnTo),
);

export const getLedger = cache((returnTo: string) =>
  getAll<LedgerRow>('/monthly-profit-ledger', 'sortBy=periodMonth&sortOrder=desc', returnTo),
);

export type OpenProject = {
  id: string;
  name: string;
  description: string | null;
  minimumInvestment: string;
  startDate: string;
};

// Projects an investor can put money into right now. The API also rejects
// projects past their end date, which this list doesn't carry; that case
// surfaces as the API's error message on submit.
export const getOpenProjects = cache(async (returnTo: string) => {
  const projects = await getAll<OpenProject>(
    '/project',
    'status=OPEN&isActive=true&isVisible=true&sortBy=name&sortOrder=asc',
    returnTo,
  );
  const now = Date.now();
  return projects.filter((p) => new Date(p.startDate).getTime() <= now);
});

export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type EditRequest = {
  id: string;
  status: EditRequestStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  editableInvestor: { address: string | null; profession: string | null; workplace: string | null } | null;
  editableNominee: { nomineeName: string | null; nomineePhone: string | null; relation: string | null } | null;
};

// Newest first; the profile page shows the latest few.
export const getEditRequests = cache(async (returnTo: string) => {
  const res = await getJson<Page<EditRequest>>(
    '/investor/edit-requests?sortBy=createdAt&sortOrder=desc&limit=10',
    returnTo,
  );
  return res?.data ?? [];
});

// Staff go to the staff home; investors without a profile finish
// verification first.
export async function requireInvestor(
  returnTo: string,
): Promise<{ user: SessionUser; profile: InvestorProfile }> {
  const user = await requireSessionUser(returnTo);
  if (user.role !== 'INVESTOR') redirect('/');
  const profile = await getProfile(returnTo);
  if (!profile) redirect('/verification');
  return { user, profile };
}
