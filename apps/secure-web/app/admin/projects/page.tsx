import type { Metadata } from 'next';
import Link from 'next/link';
import { PROJECT_STATUS, StatusBadge, optionsOf } from '@/components/admin/labels';
import { FilterBar, Pagination } from '@/components/admin/list-controls';
import { primaryButtonClass } from '@/components/dashboard/form';
import { Badge, Card, EmptyState, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { acceptingNow, canManage, listProjects, requireStaff, type ProjectStatus } from '@/lib/admin';
import { formatDate, formatRate, formatTaka } from '@/lib/format';
import { parseListQuery } from '@/lib/list-query';

export const metadata: Metadata = {
  title: 'Projects · HoneyComb Admin',
};

const PATH = '/admin/projects';
const STATUSES = ['OPEN', 'DRAFT', 'FULL', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const satisfies readonly ProjectStatus[];

export default async function AdminProjectsPage(props: PageProps<'/admin/projects'>) {
  const user = await requireStaff(PATH);
  const query = parseListQuery(await props.searchParams, STATUSES, 'all', { sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: projects, meta } = await listProjects(query.api, PATH);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Projects"
        description="What investors can put money into. A project takes applications and investments only while it’s open, visible and active, and between its start and end dates."
        actions={
          canManage(user.role) && (
            <Link href={`${PATH}/new`} className={primaryButtonClass}>
              New project
            </Link>
          )
        }
      />

      <Card>
        <div className="border-b border-hairline px-5 py-4">
          <FilterBar
            path={PATH}
            search={query.search}
            searchPlaceholder="Project name"
            status={query.status}
            statusOptions={optionsOf(PROJECT_STATUS)}
          />
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects found"
            body={
              query.search || query.status !== 'all'
                ? 'Try another search or status.'
                : 'Create a project so investors have something to apply for.'
            }
          />
        ) : (
          <Table
            minWidth={960}
            head={
              <tr>
                <th className={th}>Project</th>
                <th className={thNum}>Minimum</th>
                <th className={thNum}>Fixed rate</th>
                <th className={thNum}>Raised</th>
                <th className={th}>Dates</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {projects.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <Link
                    href={`${PATH}/${p.id}`}
                    className="font-semibold underline decoration-rule underline-offset-2 hover:decoration-black"
                  >
                    {p.name}
                  </Link>
                  {(!p.isVisible || !p.isActive) && (
                    <span className="block text-xs leading-4 text-muted">
                      {[!p.isVisible && 'Hidden', !p.isActive && 'Inactive'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </td>
                <td className={tdNum}>{formatTaka(p.minimumInvestment)}</td>
                <td className={tdNum}>{p.projectRate != null ? formatRate(p.projectRate) : '—'}</td>
                <td className={tdNum}>
                  {formatTaka(p.totalInvestedAmount)}
                  {p.targetAmount && (
                    <span className="block text-xs leading-4 text-muted">of {formatTaka(p.targetAmount)}</span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {formatDate(p.startDate)}
                  <span className="block text-xs leading-4 text-muted">
                    {p.endDate ? `to ${formatDate(p.endDate)}` : 'No end date'}
                  </span>
                </td>
                <td className={td}>
                  <StatusBadge labels={PROJECT_STATUS} status={p.status} />
                  {p.status === 'OPEN' && !acceptingNow(p) && (
                    <span className="mt-1 block">
                      <Badge tone="outline">Not taking investments</Badge>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination path={PATH} query={query} page={query.page} totalPages={meta.totalPages} total={meta.total} />
      </Card>
    </>
  );
}
