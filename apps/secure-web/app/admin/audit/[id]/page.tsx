import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, PageHeader, Table, td, th } from '@/components/dashboard/ui';
import { canManage, requireStaff } from '@/lib/admin';
import { actionLabel, fieldChanges, getAuditEntry, targetHref, targetKind, targetName } from '@/lib/audit';
import { formatDate, formatTime } from '@/lib/format';
import { Details, UUID_RE, linkClass } from '../../payouts/ui';
import { AUDIT_PATH, AdminsOnly, EntryFlags } from '../ui';

export const metadata: Metadata = {
  title: 'Audit entry · HoneyComb Admin',
};

const SEVERITY = { INFO: 'Info', WARNING: 'Warning', ERROR: 'Error', CRITICAL: 'Critical' } as const;
const STATUS = { SUCCESS: 'Succeeded', FAILED: 'Failed', PENDING: 'Pending' } as const;

function Value({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  if (value === '') return <span className="text-muted">(empty)</span>;
  return <span className="font-mono text-xs leading-5 break-all whitespace-pre-wrap">{value}</span>;
}

function Raw({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="border-t border-hairline px-5 py-3">
      <summary className="cursor-pointer text-sm leading-5 text-secondary">{title}</summary>
      <pre className="mt-3 overflow-x-auto rounded-md bg-surface p-3 text-xs leading-5 text-ink">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default async function AuditEntryPage(props: PageProps<'/admin/audit/[id]'>) {
  const { id: rawId } = await props.params;
  const returnTo = `${AUDIT_PATH}/${rawId}`;
  const user = await requireStaff(returnTo);
  if (!canManage(user.role)) return <AdminsOnly />;

  // Ids are positive integers (Postgres INT).
  if (!/^\d{1,10}$/.test(rawId) || Number(rawId) < 1 || Number(rawId) > 2_147_483_647) notFound();
  const entry = await getAuditEntry(Number(rawId), returnTo);
  if (!entry) notFound();

  const href = targetHref(entry);
  const changes = fieldChanges(entry.oldValue, entry.newValue);
  const hasBoth = entry.oldValue != null && entry.newValue != null;
  const changed = changes.filter((c) => c.changed);
  const unchanged = changes.filter((c) => !c.changed);
  const hasMetadata =
    entry.metadata != null && !(typeof entry.metadata === 'object' && Object.keys(entry.metadata).length === 0);

  const changeTable = (rows: typeof changes) => (
    <Table
      minWidth={640}
      head={
        <tr>
          <th className={th}>Field</th>
          {entry.oldValue != null && <th className={th}>Before</th>}
          {entry.newValue != null && <th className={th}>After</th>}
        </tr>
      }
    >
      {rows.map((c) => (
        <tr key={c.field}>
          <td className={`${td} font-mono text-xs leading-5 break-all`}>{c.field}</td>
          {entry.oldValue != null && (
            <td className={td}>
              <Value value={c.before} />
            </td>
          )}
          {entry.newValue != null && (
            <td className={`${td} ${c.changed ? 'font-semibold' : ''}`}>
              <Value value={c.after} />
            </td>
          )}
        </tr>
      ))}
    </Table>
  );

  return (
    <>
      <p className="text-sm leading-5">
        <Link href={AUDIT_PATH} className="text-muted underline decoration-rule underline-offset-2 hover:text-ink">
          ← Audit log
        </Link>
      </p>
      <PageHeader
        eyebrow={`Audit entry #${entry.id}`}
        title={actionLabel(entry.action)}
        description={`${formatDate(entry.createdAt)} at ${formatTime(entry.createdAt)}, Bangladesh time.`}
        actions={<EntryFlags entry={entry} />}
      />

      <Card title="Details">
        <Details
          items={[
            [
              'Who',
              entry.adminProfileId ? (
                <Link href={`${AUDIT_PATH}?${new URLSearchParams({ admin: entry.adminProfileId })}`} className={linkClass}>
                  {entry.adminName ?? 'Unnamed staff'}
                </Link>
              ) : (
                (entry.adminName ?? 'System')
              ),
            ],
            [
              targetKind(entry.targetTable),
              href ? (
                <Link href={href} className={linkClass}>
                  {targetName(entry)}
                </Link>
              ) : (
                targetName(entry)
              ),
            ],
            [
              'History',
              UUID_RE.test(entry.targetId) ? (
                <Link href={`${AUDIT_PATH}?${new URLSearchParams({ target: entry.targetId })}`} className={linkClass}>
                  Every entry for this record
                </Link>
              ) : (
                'Not available for this record'
              ),
            ],
            ['Result', STATUS[entry.status] ?? entry.status],
            ['Severity', SEVERITY[entry.severity] ?? entry.severity],
            ['Area', entry.module ? entry.module.charAt(0) + entry.module.slice(1).toLowerCase().replace(/_/g, ' ') : ''],
            ['IP address', entry.ipAddress],
            ['Browser', entry.userAgent],
            ['Record id', <span key="id" className="font-mono text-xs">{entry.targetId}</span>],
          ]}
        />
        {entry.statement && (
          <p className="border-t border-hairline px-5 py-3 text-sm leading-5 whitespace-pre-wrap text-ink">
            {entry.statement}
          </p>
        )}
      </Card>

      <Card
        title={hasBoth ? 'What changed' : entry.newValue != null ? 'What was recorded' : entry.oldValue != null ? 'What was removed' : 'Changes'}
        description={
          hasBoth
            ? changed.length === 0
              ? 'Nothing differs between before and after.'
              : `${changed.length} ${changed.length === 1 ? 'field' : 'fields'} changed.`
            : undefined
        }
      >
        {changes.length === 0 ? (
          <p className="px-5 py-4 text-sm leading-5 text-muted">This entry has no before or after values.</p>
        ) : hasBoth ? (
          <>
            {changed.length > 0 && changeTable(changed)}
            {unchanged.length > 0 && (
              <details className="border-t border-hairline">
                <summary className="cursor-pointer px-5 py-3 text-sm leading-5 text-secondary">
                  {unchanged.length} unchanged {unchanged.length === 1 ? 'field' : 'fields'}
                </summary>
                {changeTable(unchanged)}
              </details>
            )}
          </>
        ) : (
          changeTable(changes)
        )}
        {entry.oldValue != null && <Raw title="Before, as stored" value={entry.oldValue} />}
        {entry.newValue != null && <Raw title="After, as stored" value={entry.newValue} />}
        {hasMetadata && <Raw title="Extra details" value={entry.metadata} />}
      </Card>
    </>
  );
}
