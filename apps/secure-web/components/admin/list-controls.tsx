import Link from 'next/link';
import { listHref } from '@/lib/list-query';

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

// GET form, so filters live in the URL: shareable, bookmarkable, and the
// browser Back button works. Changing a filter starts again at page 1.
export function FilterBar({
  path,
  search,
  searchPlaceholder,
  status,
  statusOptions,
}: {
  path: string;
  search: string;
  searchPlaceholder: string;
  status: string;
  statusOptions: { value: string; label: string }[];
}) {
  return (
    <form action={path} method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="list-q" className="sr-only">
        Search
      </label>
      <input
        id="list-q"
        name="q"
        type="search"
        defaultValue={search}
        maxLength={150}
        placeholder={searchPlaceholder}
        className={`${fieldClass} w-full sm:w-72`}
      />
      <label htmlFor="list-status" className="sr-only">
        Status
      </label>
      <select id="list-status" name="status" defaultValue={status} className={fieldClass}>
        <option value="all">All statuses</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
      >
        Apply
      </button>
    </form>
  );
}

export function Pagination({
  path,
  query,
  page,
  totalPages,
  total,
}: {
  path: string;
  query: { search: string; status: string };
  page: number;
  totalPages: number;
  total: number;
}) {
  if (total === 0) return null;
  const link = 'text-sm leading-5 text-ink underline decoration-rule underline-offset-2 hover:decoration-black';
  // A hand-edited ?page= past the end lands on an empty page; "Previous"
  // then goes to the real last page rather than page − 1.
  const pastEnd = page > totalPages;

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4 border-t border-hairline px-5 py-3">
      <p className="text-xs leading-4 text-muted">
        {total} {total === 1 ? 'record' : 'records'}
        {pastEnd ? ` · ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}` : ` · page ${page} of ${totalPages}`}
      </p>
      <div className="flex gap-4">
        {page > 1 && (
          <Link href={listHref(path, query, { page: String(pastEnd ? totalPages : page - 1) })} className={link}>
            {pastEnd ? 'Last page' : 'Previous'}
          </Link>
        )}
        {page < totalPages && (
          <Link href={listHref(path, query, { page: String(page + 1) })} className={link}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
