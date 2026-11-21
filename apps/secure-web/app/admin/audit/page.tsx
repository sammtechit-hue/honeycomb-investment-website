import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, EmptyState, Notice, PageHeader, Table, td, th } from '@/components/dashboard/ui';
import { canManage, requireStaff } from '@/lib/admin';
import {
  ACTION_GROUPS,
  TARGET_TABLES,
  actionLabel,
  isAuditAction,
  listAudit,
  targetHref,
  targetKind,
  targetName,
} from '@/lib/audit';
import { formatDate, formatTime } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import { SimplePagination, UUID_RE, linkClass, one, pageParam } from '../payouts/ui';
import { AUDIT_PATH, AdminsOnly, EntryFlags } from './ui';

export const metadata: Metadata = {
  title: 'Audit log · HoneyComb Admin',
};

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateParam = (v: string | string[] | undefined) => {
  const s = one(v) ?? '';
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(s)) ? s : '';
};
const uuidParam = (v: string | string[] | undefined) => {
  const s = one(v) ?? '';
  return UUID_RE.test(s) ? s : '';
};

export default async function AuditLogPage(props: PageProps<'/admin/audit'>) {
  const user = await requireStaff(AUDIT_PATH);
  if (!canManage(user.role)) return <AdminsOnly />;

  const params = await props.searchParams;
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawAction = one(params.action);
  const action = isAuditAction(rawAction) ? rawAction : '';
  const rawTable = one(params.table);
  const table = TARGET_TABLES.find((t) => t === rawTable) ?? '';
  const from = dateParam(params.from);
  let to = dateParam(params.to);
  const backwards = !!(from && to && to < from);
  if (backwards) to = '';
  const adminId = uuidParam(params.admin);
  const targetId = uuidParam(params.target);
  const page = pageParam(params.page);

  const api = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...(search && { search }),
    ...(action && { action }),
    ...(table && { targetTable: table }),
    ...(adminId && { adminProfileId: adminId }),
    ...(targetId && { targetId }),
    // Whole days in Bangladesh time.
    ...(from && { createdFrom: `${from}T00:00:00.000+06:00` }),
    ...(to && { createdTo: `${to}T23:59:59.999+06:00` }),
  });
  const { data: entries, meta } = await listAudit(api, AUDIT_PATH);

  const keep = {
    ...(search && { q: search }),
    ...(action && { action }),
    ...(table && { table }),
    ...(from && { from }),
    ...(to && { to }),
    ...(adminId && { admin: adminId }),
    ...(targetId && { target: targetId }),
  };
  const hrefFor = (p: number) => `${AUDIT_PATH}?${new URLSearchParams({ ...keep, page: String(p) })}`;
  // The same filters without one of them (for "show everyone" links).
  const without = (key: keyof typeof keep) => {
    const rest: Record<string, string> = { ...keep };
    delete rest[key];
    const qs = new URLSearchParams(rest).toString();
    return qs ? `${AUDIT_PATH}?${qs}` : AUDIT_PATH;
  };
  const filtered = Object.keys(keep).length > 0;
  const first = entries[0];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        description="Every change staff make, and every staff sign-in: who did it, to what, and when. Entries can’t be edited."
      />

      {(adminId || targetId) && (
        <div className="flex flex-col gap-1 text-sm leading-5 text-ink">
          {adminId && (
            <p>
              Showing what {first?.adminName ?? 'this staff member'} did.{' '}
              <Link href={without('admin')} className="text-muted underline">
                Show everyone
              </Link>
            </p>
          )}
          {targetId && (
            <p>
              Showing the history of{' '}
              {first ? `${targetKind(first.targetTable).toLowerCase()} ${targetName(first)}` : 'one record'}.{' '}
              <Link href={without('target')} className="text-muted underline">
                Show all records
              </Link>
            </p>
          )}
        </div>
      )}

      {backwards && (
        <Notice title="Dates ignored">The end date was before the start date, so only the start date is used.</Notice>
      )}

      <Card>
        <form method="get" action={AUDIT_PATH} className="flex flex-col gap-3 border-b border-hairline px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label htmlFor="audit-q" className="sr-only">
              Search
            </label>
            <input
              id="audit-q"
              name="q"
              type="search"
              defaultValue={search}
              maxLength={150}
              placeholder="Staff name or action"
              className={`${fieldClass} w-full sm:w-60`}
            />
            <label htmlFor="audit-action" className="sr-only">
              Action
            </label>
            <select id="audit-action" name="action" defaultValue={action} className={fieldClass}>
              <option value="">All actions</option>
              {ACTION_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {Object.entries(g.actions).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label htmlFor="audit-table" className="sr-only">
              Record type
            </label>
            <select id="audit-table" name="table" defaultValue={table} className={fieldClass}>
              <option value="">All records</option>
              {TARGET_TABLES.map((t) => (
                <option key={t} value={t}>
                  {targetKind(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label htmlFor="audit-from" className="text-sm leading-5 text-muted">
              From
            </label>
            <input id="audit-from" name="from" type="date" defaultValue={from} className={fieldClass} />
            <label htmlFor="audit-to" className="text-sm leading-5 text-muted">
              to
            </label>
            <input id="audit-to" name="to" type="date" defaultValue={to} className={fieldClass} />
            {adminId && <input type="hidden" name="admin" value={adminId} />}
            {targetId && <input type="hidden" name="target" value={targetId} />}
            <button
              type="submit"
              className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
            >
              Apply
            </button>
            {filtered && (
              <Link href={AUDIT_PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
                Clear
              </Link>
            )}
          </div>
        </form>

        {entries.length === 0 ? (
          <EmptyState
            title="No entries"
            body={filtered ? 'Nothing matches these filters.' : 'Staff actions are recorded here as they happen.'}
          />
        ) : (
          <Table
            minWidth={900}
            head={
              <tr>
                <th className={th}>When</th>
                <th className={th}>Who</th>
                <th className={th}>What happened</th>
                <th className={th}>Record</th>
                <th className={th}>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            }
          >
            {entries.map((e) => {
              const href = targetHref(e);
              return (
                <tr key={e.id}>
                  <td className={`${td} whitespace-nowrap`}>
                    {formatDate(e.createdAt)}
                    <span className="block text-xs leading-4 text-muted">{formatTime(e.createdAt)}</span>
                  </td>
                  <td className={td}>
                    {e.adminProfileId ? (
                      <Link
                        href={`${AUDIT_PATH}?${new URLSearchParams({ admin: e.adminProfileId })}`}
                        className={linkClass}
                      >
                        {e.adminName ?? 'Unnamed staff'}
                      </Link>
                    ) : (
                      <span className="text-muted">{e.adminName ?? 'System'}</span>
                    )}
                  </td>
                  <td className={td}>
                    {actionLabel(e.action)}
                    <EntryFlags entry={e} />
                  </td>
                  <td className={td}>
                    <span className="block text-xs leading-4 text-muted">{targetKind(e.targetTable)}</span>
                    {href ? (
                      <Link href={href} className={linkClass}>
                        {targetName(e)}
                      </Link>
                    ) : (
                      <span className="break-all">{targetName(e)}</span>
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    <Link href={`${AUDIT_PATH}/${e.id}`} className="text-sm leading-5 whitespace-nowrap text-ink underline">
                      Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['entry', 'entries']} />
      </Card>
    </>
  );
}
