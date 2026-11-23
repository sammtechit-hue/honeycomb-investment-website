import Link from 'next/link';
import { secondaryButtonClass } from '@/components/dashboard/form';
import { Badge, Notice, PageHeader } from '@/components/dashboard/ui';
import { canManage, type StaffRole } from '@/lib/admin';
import type { AuditEntry } from '@/lib/audit';

export const AUDIT_PATH = '/admin/audit';

// "History" on a record's page: its audit entries. Admins only, like the log.
export function HistoryLink({ role, targetId }: { role: StaffRole; targetId: string }) {
  if (!canManage(role)) return null;
  return (
    <Link href={`${AUDIT_PATH}?${new URLSearchParams({ target: targetId })}`} className={secondaryButtonClass}>
      History
    </Link>
  );
}

// The API refuses moderators, so they get this instead of an error page.
export function AdminsOnly() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Audit log" />
      <Notice title="Only admins can see the audit log">
        Ask an admin if you need to know who changed something.
      </Notice>
    </>
  );
}

// Only shown when something is out of the ordinary: a warning or worse, or
// an action that didn't succeed.
export function EntryFlags({ entry }: { entry: Pick<AuditEntry, 'severity' | 'status'> }) {
  const flags: string[] = [];
  if (entry.severity !== 'INFO') flags.push(entry.severity === 'WARNING' ? 'Warning' : entry.severity === 'ERROR' ? 'Error' : 'Critical');
  if (entry.status === 'FAILED') flags.push('Failed');
  if (entry.status === 'PENDING') flags.push('Pending');
  if (flags.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} tone={f === 'Warning' || f === 'Pending' ? 'outline' : 'solid'}>
          {f}
        </Badge>
      ))}
    </span>
  );
}
