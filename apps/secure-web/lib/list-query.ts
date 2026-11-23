// Turns a list page's URL (?q=&status=&page=) into the API query, accepting
// only known values so a hand-edited URL can't send junk to the API.

type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 20;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export type ListQuery<S extends string> = {
  search: string;
  // 'all' means no status filter.
  status: S | 'all';
  page: number;
  api: URLSearchParams;
};

export function parseListQuery<S extends string>(
  params: SearchParams,
  statuses: readonly S[],
  defaultStatus: S | 'all',
  base: Record<string, string> = {},
): ListQuery<S> {
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawStatus = one(params.status);
  const status: S | 'all' =
    rawStatus === 'all' ? 'all' : statuses.includes(rawStatus as S) ? (rawStatus as S) : defaultStatus;
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10_000 ? rawPage : 1;

  const api = new URLSearchParams({ ...base, page: String(page), limit: String(PAGE_SIZE) });
  if (search) api.set('search', search);
  if (status !== 'all') api.set('status', status);
  return { search, status, page, api };
}

// The list page's own URL with some params changed (for filters and paging).
export function listHref(path: string, current: { search: string; status: string }, changes: Record<string, string>) {
  const params = new URLSearchParams();
  if (current.search) params.set('q', current.search);
  params.set('status', current.status);
  for (const [key, value] of Object.entries(changes)) params.set(key, value);
  return `${path}?${params.toString()}`;
}
