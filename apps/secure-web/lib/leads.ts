import { getJson, getPage, pageOf, type Page } from './server-api';

// Server-side reads for the ROI calculator leads screen. Shapes mirror
// apps/api/src/admin/roi-calculator-lead/roi-calculator-lead.service.ts,
// which returns the whole Prisma row.
//
// A lead is someone who used the ROI calculator on the public site and left
// their details. Staff call them and tick "followed up"; that flag is the only
// thing the API lets staff change.

export type AdminLead = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  // Decimal, sent as a string ("500000.00").
  enteredAmount: string;
  createdAt: string;
  followedUp: boolean;
};

const PATH = '/admin/roi-calculator-lead';

export const LEAD_SORTS = {
  newest: { label: 'Newest first', sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { label: 'Oldest first', sortBy: 'createdAt', sortOrder: 'asc' },
  name: { label: 'Name A–Z', sortBy: 'name', sortOrder: 'asc' },
} as const;

export type LeadSort = keyof typeof LEAD_SORTS;

export type LeadFilters = {
  search?: string;
  minAmount?: string;
  maxAmount?: string;
};

function filterQuery(f: LeadFilters): Record<string, string> {
  return {
    ...(f.search && { search: f.search }),
    ...(f.minAmount && { minAmount: f.minAmount }),
    ...(f.maxAmount && { maxAmount: f.maxAmount }),
  };
}

export function listLeads(
  filters: LeadFilters,
  sort: LeadSort,
  page: number,
  limit: number,
  returnTo: string,
): Promise<Page<AdminLead>> {
  const { sortBy, sortOrder } = LEAD_SORTS[sort];
  return getPage<AdminLead>(
    PATH,
    new URLSearchParams({ ...filterQuery(filters), sortBy, sortOrder, page: String(page), limit: String(limit) }),
    returnTo,
  );
}

// At 100 a page, up to 5,000 leads in one state before we give up and say so.
const MAX_PAGES = 50;

// Every lead with one follow-up state. The API can't filter on `followedUp`
// but can sort on it (then by id), so walk the pages with the wanted state
// first and stop at the first lead with the other state: the count is exact
// and we only read the rows we need, plus at most one page.
export async function getLeadsByFollowUp(followedUp: boolean, filters: LeadFilters, returnTo: string) {
  const rows: AdminLead[] = [];
  // false sorts before true, so "followed up" wants descending.
  const sortOrder = followedUp ? 'desc' : 'asc';
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await getJson<Page<AdminLead>>(
      `${PATH}?${new URLSearchParams({
        ...filterQuery(filters),
        sortBy: 'followedUp',
        sortOrder,
        limit: '100',
        page: String(page),
      })}`,
      returnTo,
    );
    if (!res) return { rows, complete: true };
    const matching = res.data.filter((l) => l.followedUp === followedUp);
    rows.push(...matching);
    // Reached the other state, or the end of the list.
    if (matching.length < res.data.length || page >= res.meta.totalPages) return { rows, complete: true };
  }
  return { rows, complete: false };
}

// One page of a follow-up state, sorted here like the API would.
export async function pageLeadsByFollowUp(
  followedUp: boolean,
  filters: LeadFilters,
  sort: LeadSort,
  page: number,
  limit: number,
  returnTo: string,
) {
  const { rows, complete } = await getLeadsByFollowUp(followedUp, filters, returnTo);
  const { sortBy, sortOrder } = LEAD_SORTS[sort];
  const dir = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    const primary =
      sortBy === 'name'
        ? a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
        : Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return primary * dir || a.id.localeCompare(b.id);
  });
  return { ...pageOf(sorted, page, limit), complete };
}

// For the overview card.
export async function countLeadsToFollowUp(returnTo: string) {
  const { rows, complete } = await getLeadsByFollowUp(false, {}, returnTo);
  return { count: rows.length, complete };
}
