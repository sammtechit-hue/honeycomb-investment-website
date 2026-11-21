import Link from 'next/link';
import { Badge, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import type { AdminMonthlyRate } from '@/lib/admin';
import { formatDate, formatRate } from '@/lib/format';
import { RateRowActions } from './rate-forms';

// periodMonth is the first of the month at UTC midnight; format it in UTC so
// it never slips into the previous month.
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function RatesTable({
  rates,
  showProject,
  manage,
}: {
  rates: AdminMonthlyRate[];
  showProject: boolean;
  manage: boolean;
}) {
  return (
    <Table
      minWidth={showProject ? 760 : 560}
      head={
        <tr>
          <th className={th}>Month</th>
          {showProject && <th className={th}>Project</th>}
          <th className={thNum}>Rate</th>
          <th className={th}>Set on</th>
          <th className={th}>Status</th>
          {manage && <th className={thNum}>Actions</th>}
        </tr>
      }
    >
      {rates.map((r) => (
        <tr key={r.id}>
          <td className={`${td} whitespace-nowrap`}>{monthFormat.format(new Date(r.periodMonth))}</td>
          {showProject && (
            <td className={td}>
              <Link
                href={`/admin/projects/${r.projectId}`}
                className="underline decoration-rule underline-offset-2 hover:decoration-black"
              >
                {r.project.name}
              </Link>
            </td>
          )}
          <td className={tdNum}>{formatRate(r.ratePercent)}</td>
          <td className={`${td} whitespace-nowrap`}>{formatDate(r.setAt)}</td>
          <td className={td}>{r.isActive ? <Badge tone="muted">In use</Badge> : <Badge tone="outline">Off</Badge>}</td>
          {manage && (
            <td className={`${td} text-right`}>
              <RateRowActions id={r.id} rate={r.ratePercent} isActive={r.isActive} />
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}
