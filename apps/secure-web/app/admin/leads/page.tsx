import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { requireStaff } from '@/lib/admin';
import { formatDate, formatTaka, formatTime } from '@/lib/format';
import {
  LEAD_SORTS,
  listLeads,
  pageLeadsByFollowUp,
  type AdminLead,
  type LeadFilters,
  type LeadSort,
} from '@/lib/leads';
import { PAGE_SIZE } from '@/lib/list-query';
import type { Page } from '@/lib/server-api';
import { SimplePagination, one, pageParam } from '../payouts/ui';
import { FollowUpToggle } from './follow-up-toggle';

export const metadata: Metadata = {
  title: 'ROI calculator leads · HoneyComb Admin',
};

const PATH = '/admin/leads';

const STATUS_OPTIONS = {
  open: 'Not followed up',
  done: 'Followed up',
} as const;
type StatusFilter = keyof typeof STATUS_OPTIONS | 'all';

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

// A taka amount as the API accepts it (non-negative, up to 2 decimals, within
// Decimal(14,2)). Anything else in the URL is dropped rather than sent.
function amountParam(v: string | string[] | undefined) {
  const s = (one(v) ?? '').trim().replace(/,/g, '');
  return /^\d{1,9}(\.\d{1,2})?$/.test(s) ? String(Number(s)) : '';
}

// The API stores phones in local form (01711223344), so a pasted
// "+880 1711-223344" or "01711 223344" would match nothing. When the search
// is a whole phone number, send it in that form.
function apiSearch(search: string) {
  const compact = search.replace(/[\s\-()]/g, '');
  if (/^\+?880\d{10}$/.test(compact)) return `0${compact.slice(-10)}`;
  if (/^0\d{10}$/.test(compact)) return compact;
  return search;
}

export default async function AdminLeadsPage(props: PageProps<'/admin/leads'>) {
  await requireStaff(PATH);
  const params = await props.searchParams;
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawStatus = one(params.status);
  const status: StatusFilter = rawStatus === 'open' || rawStatus === 'done' ? rawStatus : 'all';
  const rawSort = one(params.sort);
  const sort: LeadSort = rawSort && Object.hasOwn(LEAD_SORTS, rawSort) ? (rawSort as LeadSort) : 'newest';
  const min = amountParam(params.min);
  const max = amountParam(params.max);
  const rangeBackwards = !!min && !!max && Number(min) > Number(max);
  const page = pageParam(params.page);

  const filters: LeadFilters = {
    ...(search && { search: apiSearch(search) }),
    // A backwards range would match nothing; show a hint instead.
    ...(!rangeBackwards && min && { minAmount: min }),
    ...(!rangeBackwards && max && { maxAmount: max }),
  };

  let leads: AdminLead[];
  let meta: Page<AdminLead>['meta'];
  let complete = true;
  if (status === 'all') {
    ({ data: leads, meta } = await listLeads(filters, sort, page, PAGE_SIZE, PATH));
  } else {
    // The API can't filter on follow-up: read that state's leads, page here.
    ({ data: leads, meta, complete } = await pageLeadsByFollowUp(
      status === 'done',
      filters,
      sort,
      page,
      PAGE_SIZE,
      PATH,
    ));
  }

  const query = {
    ...(search && { q: search }),
    ...(status !== 'all' && { status }),
    ...(sort !== 'newest' && { sort }),
    ...(min && { min }),
    ...(max && { max }),
  };
  const hrefFor = (p: number) => `${PATH}?${new URLSearchParams({ ...query, page: String(p) })}`;
  const filtered = !!(search || status !== 'all' || min || max);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="ROI calculator leads"
        description="People who used the ROI calculator on the website and left their details. Contact them, then mark them as followed up."
      />

      <Card>
        <form
          method="get"
          action={PATH}
          className="flex flex-col gap-2 border-b border-hairline px-5 py-4 lg:flex-row lg:flex-wrap lg:items-center"
        >
          <label htmlFor="leads-q" className="sr-only">
            Search
          </label>
          <input
            id="leads-q"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={150}
            placeholder="Name, phone or email"
            className={`${fieldClass} w-full lg:w-64`}
          />
          <label htmlFor="leads-status" className="sr-only">
            Follow-up
          </label>
          <select id="leads-status" name="status" defaultValue={status} className={fieldClass}>
            <option value="all">All leads</option>
            {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label htmlFor="leads-min" className="sr-only">
              Minimum amount (৳)
            </label>
            <input
              id="leads-min"
              name="min"
              inputMode="decimal"
              defaultValue={min}
              placeholder="Min ৳"
              className={`${fieldClass} w-full tabular-nums lg:w-28`}
            />
            <span aria-hidden className="text-sm text-muted">
              –
            </span>
            <label htmlFor="leads-max" className="sr-only">
              Maximum amount (৳)
            </label>
            <input
              id="leads-max"
              name="max"
              inputMode="decimal"
              defaultValue={max}
              placeholder="Max ৳"
              className={`${fieldClass} w-full tabular-nums lg:w-28`}
            />
          </div>
          <label htmlFor="leads-sort" className="sr-only">
            Sort
          </label>
          <select id="leads-sort" name="sort" defaultValue={sort} className={fieldClass}>
            {Object.entries(LEAD_SORTS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Apply
          </button>
          {(filtered || sort !== 'newest') && (
            <Link href={PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
              Clear
            </Link>
          )}
        </form>

        {rangeBackwards && (
          <div className="border-b border-hairline px-5 py-3">
            <Notice title="Amount range not applied">
              The minimum ({formatTaka(min)}) is above the maximum ({formatTaka(max)}). Swap them to filter by amount.
            </Notice>
          </div>
        )}
        {!complete && (
          <div className="border-b border-hairline px-5 py-3">
            <Notice title="This list may be incomplete">
              There are too many leads to read at once, so some may be missing. Narrow it with a search or an amount
              range.
            </Notice>
          </div>
        )}

        {leads.length === 0 ? (
          <EmptyState
            title="No leads"
            body={
              status === 'open' && !search && !min && !max
                ? 'Every lead has been followed up.'
                : filtered
                  ? 'Try another search or filter.'
                  : 'When someone uses the ROI calculator on the website and leaves their details, they show here.'
            }
          />
        ) : (
          <Table
            minWidth={960}
            head={
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Contact</th>
                <th className={thNum}>Amount entered</th>
                <th className={th}>Submitted</th>
                <th className={th}>Follow-up</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {leads.map((l) => (
              <tr key={l.id}>
                <td className={`${td} font-semibold break-words`}>{l.name}</td>
                <td className={td}>
                  <a href={`tel:${l.phoneNumber}`} className="tabular-nums underline decoration-rule underline-offset-2 hover:decoration-black">
                    {l.phoneNumber}
                  </a>
                  {l.email ? (
                    <a
                      href={`mailto:${l.email}`}
                      className="mt-1 block text-xs leading-4 break-all text-muted underline decoration-rule underline-offset-2 hover:decoration-black"
                    >
                      {l.email}
                    </a>
                  ) : (
                    <span className="mt-1 block text-xs leading-4 text-muted">No email</span>
                  )}
                </td>
                <td className={tdNum}>{formatTaka(l.enteredAmount)}</td>
                <td className={`${td} whitespace-nowrap`}>
                  {formatDate(l.createdAt)}
                  <span className="block text-xs leading-4 text-muted">{formatTime(l.createdAt)}</span>
                </td>
                <td className={td}>
                  {l.followedUp ? <Badge tone="muted">Followed up</Badge> : <Badge tone="solid">Not followed up</Badge>}
                </td>
                <td className={`${td} text-right`}>
                  <FollowUpToggle id={l.id} followedUp={l.followedUp} name={l.name} />
                </td>
              </tr>
            ))}
          </Table>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['lead', 'leads']} />
      </Card>
    </>
  );
}
