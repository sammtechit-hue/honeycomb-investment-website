import type { Metadata } from 'next';
import Link from 'next/link';
import { EDIT_REQUEST_STATUS, StatusBadge, optionsOf } from '@/components/admin/labels';
import { FilterBar, Pagination } from '@/components/admin/list-controls';
import { Card, EmptyState, PageHeader, Table, td, th } from '@/components/dashboard/ui';
import { listEditRequests, requireStaff, type EditRequestStatus } from '@/lib/admin';
import { formatDate } from '@/lib/format';
import { parseListQuery } from '@/lib/list-query';

export const metadata: Metadata = {
  title: 'Change requests · HoneyComb Admin',
};

const PATH = '/admin/change-requests';
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const satisfies readonly EditRequestStatus[];

export default async function ChangeRequestsPage(props: PageProps<'/admin/change-requests'>) {
  await requireStaff(PATH);
  const query = parseListQuery(await props.searchParams, STATUSES, 'PENDING', { sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: requests, meta } = await listEditRequests(query.api, PATH);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Change requests"
        description="Profile and nominee changes investors have asked for. Nothing changes on their profile until you approve."
      />

      <Card>
        <div className="border-b border-hairline px-5 py-4">
          <FilterBar
            path={PATH}
            search={query.search}
            searchPlaceholder="Name, email or mobile"
            status={query.status}
            statusOptions={optionsOf(EDIT_REQUEST_STATUS)}
          />
        </div>

        {requests.length === 0 ? (
          <EmptyState
            title={query.status === 'PENDING' && !query.search ? 'No changes to review' : 'No requests found'}
            body={
              query.status === 'PENDING' && !query.search
                ? 'New requests appear here when investors submit them.'
                : 'Try another search or status.'
            }
          />
        ) : (
          <Table
            minWidth={720}
            head={
              <tr>
                <th className={th}>Investor</th>
                <th className={th}>Mobile</th>
                <th className={th}>Submitted</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {requests.map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  <Link
                    href={`${PATH}/${r.id}`}
                    className="font-semibold underline decoration-rule underline-offset-2 hover:decoration-black"
                  >
                    {r.investor.fullname}
                  </Link>
                  <span className="block text-xs leading-4 break-all text-muted">{r.investor.user.email}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>{r.investor.user.phone ?? '—'}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                <td className={td}>
                  <StatusBadge labels={EDIT_REQUEST_STATUS} status={r.status} />
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
