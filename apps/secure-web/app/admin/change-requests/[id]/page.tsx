import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { DocumentTile } from '@/components/admin/document';
import { EDIT_REQUEST_STATUS, StatusBadge } from '@/components/admin/labels';
import { Card, Notice, PageHeader, Table, td, th } from '@/components/dashboard/ui';
import { getEditRequest, getInvestor, requireStaff } from '@/lib/admin';
import { formatDate } from '@/lib/format';
import { ReviewForm } from './review-form';

export const metadata: Metadata = {
  title: 'Change request · HoneyComb Admin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = { field: string; current: ReactNode; requested: ReactNode };

export default async function ChangeRequestPage(props: PageProps<'/admin/change-requests/[id]'>) {
  const { id } = await props.params;
  const returnTo = `/admin/change-requests/${id}`;
  await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();

  const detail = await getEditRequest(id, returnTo);
  if (!detail) notFound();
  const { editRequest, pendingEdits } = detail;
  const current = await getInvestor(detail.investor.id, returnTo);

  // Only fields the investor asked to change are staged (the rest are null).
  const rows: Row[] = [];
  const add = (field: string, now: ReactNode, next: string | null | undefined) => {
    if (next !== null && next !== undefined && next !== '') rows.push({ field, current: now || '—', requested: next });
  };
  add('Address', current?.address, pendingEdits.investor?.address);
  add('Profession', current?.profession, pendingEdits.investor?.profession);
  add('Workplace', current?.workplace, pendingEdits.investor?.workplace);
  add('Nominee name', current?.nominee?.nomineeName, pendingEdits.nominee?.nomineeName);
  add('Nominee relation', current?.nominee?.relation, pendingEdits.nominee?.relation);
  add('Nominee mobile', current?.nominee?.nomineePhone, pendingEdits.nominee?.nomineePhone);
  add('Email', current?.user.email, pendingEdits.user?.email);
  add('Mobile', current?.user.phone, pendingEdits.user?.phone);
  if (pendingEdits.user?.passwordGiven) rows.push({ field: 'Password', current: '—', requested: 'New password set' });

  const documents = [
    ['New NID front', pendingEdits.kycDocuments?.nidFront],
    ['New NID back', pendingEdits.kycDocuments?.nidBack],
    ['New photo', pendingEdits.kycDocuments?.photo],
    ['New nominee NID front', pendingEdits.nominee?.nomineeNidFront],
    ['New nominee NID back', pendingEdits.nominee?.nomineeNidBack],
    ['New nominee photo', pendingEdits.nominee?.nomineePhoto],
  ].filter((d): d is [string, string] => !!d[1]);

  return (
    <>
      <PageHeader
        eyebrow="Change request"
        title={detail.investor.fullname}
        description={`Submitted ${formatDate(editRequest.createdAt)}`}
        actions={<StatusBadge labels={EDIT_REQUEST_STATUS} status={editRequest.status} />}
      />

      <Card
        title="Requested changes"
        action={
          <Link
            href={`/admin/investors/${detail.investor.id}`}
            className="text-sm leading-5 text-ink underline decoration-rule underline-offset-2 hover:decoration-black"
          >
            View investor
          </Link>
        }
      >
        {rows.length === 0 && documents.length === 0 ? (
          <p className="p-5 text-sm leading-5 text-muted">This request has no staged changes.</p>
        ) : (
          <>
            {rows.length > 0 && (
              <Table
                minWidth={640}
                head={
                  <tr>
                    <th className={th}>Field</th>
                    <th className={th}>Current</th>
                    <th className={th}>Requested</th>
                  </tr>
                }
              >
                {rows.map((r) => (
                  <tr key={r.field}>
                    <td className={`${td} whitespace-nowrap text-muted`}>{r.field}</td>
                    <td className={`${td} break-words`}>{r.current}</td>
                    <td className={`${td} font-semibold break-words`}>{r.requested}</td>
                  </tr>
                ))}
              </Table>
            )}
            {documents.length > 0 && (
              <div className="grid grid-cols-1 gap-4 border-t border-hairline p-5 sm:grid-cols-3">
                {documents.map(([label, url]) => (
                  <DocumentTile key={label} label={label} url={url} />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {editRequest.status === 'PENDING' ? (
        <Card title="Decision">
          <div className="p-5">
            <ReviewForm requestId={editRequest.id} />
          </div>
        </Card>
      ) : (
        <Notice title={editRequest.status === 'APPROVED' ? 'Approved' : 'Rejected'}>
          Reviewed {formatDate(editRequest.reviewedAt)}
          {editRequest.rejectionReason ? ` — ${editRequest.rejectionReason}` : '.'}
        </Notice>
      )}
    </>
  );
}
