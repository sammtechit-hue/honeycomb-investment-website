import type { Metadata } from 'next';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, td, th, type BadgeTone } from '@/components/dashboard/ui';
import { ROLE_LABEL, requireStaff } from '@/lib/admin';
import { formatDate, formatTime } from '@/lib/format';
import { listInvites, type InviteStatus } from '@/lib/staff';
import { SimplePagination, pageParam } from '../payouts/ui';
import { InviteForm, ResendButton } from './invite-form';

export const metadata: Metadata = {
  title: 'Staff invites · HoneyComb Admin',
};

const PATH = '/admin/staff';
const PAGE_SIZE = 10;

const STATUS: Record<InviteStatus, { label: string; tone: BadgeTone; hint: string }> = {
  joined: { label: 'Joined', tone: 'muted', hint: 'Has set a password' },
  waiting: { label: 'Invite sent', tone: 'outline', hint: 'Hasn’t set a password yet' },
  expired: { label: 'Link expired', tone: 'solid', hint: 'The 72-hour link ran out: resend it' },
  email_failed: { label: 'Email not sent', tone: 'solid', hint: 'The invite email failed: resend it' },
};

export default async function StaffInvitesPage(props: PageProps<'/admin/staff'>) {
  const user = await requireStaff(PATH);
  // The API only lets super admins create staff accounts.
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Staff invites" />
        <Notice title="Only super admins can invite staff">
          Ask a super admin to create an account for a new team member.
        </Notice>
      </>
    );
  }

  const params = await props.searchParams;
  const page = pageParam(params.page);
  const { data: invites, meta } = await listInvites(page, PAGE_SIZE, PATH);
  const hrefFor = (p: number) => `${PATH}?page=${p}`;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Staff invites"
        description="Create an account for a new admin or moderator. They get an email with a link to set their own password; you never see it."
      />

      <Card>
        <div className="border-b border-hairline px-5 py-4">
          <h2 className="text-sm leading-5 font-semibold text-ink">Invite someone</h2>
        </div>
        <div className="max-w-[720px] p-5">
          <InviteForm />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-1 border-b border-hairline px-5 py-4">
          <h2 className="text-sm leading-5 font-semibold text-ink">People invited</h2>
          <p className="text-xs leading-4 text-muted">
            Built from the audit log, so it shows invites sent from this page. Accounts made another way aren’t
            listed. Someone who has joined and forgets their password uses “Forgot password” on the sign-in page.
          </p>
        </div>

        {invites.length === 0 ? (
          <EmptyState title="No invites yet" body="People you invite show here until they join, and after." />
        ) : (
          <Table
            minWidth={880}
            head={
              <tr>
                <th className={th}>Email</th>
                <th className={th}>Role</th>
                <th className={th}>Invited</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {invites.map((i) => {
              const s = STATUS[i.status];
              return (
                <tr key={i.userId}>
                  <td className={`${td} break-all`}>{i.email}</td>
                  <td className={td}>{i.role ? ROLE_LABEL[i.role] : '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {formatDate(i.invitedAt)}
                    <span className="block text-xs leading-4 text-muted">
                      {i.invitedBy ? `by ${i.invitedBy}` : formatTime(i.invitedAt)}
                    </span>
                  </td>
                  <td className={td}>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className="mt-1 block text-xs leading-4 text-muted">
                      {s.hint}
                      {i.status !== 'joined' && i.resends > 0 && (
                        <>
                          {' · '}
                          resent {i.resends === 1 ? 'once' : `${i.resends} times`}, last {formatDate(i.lastSentAt)}{' '}
                          {formatTime(i.lastSentAt)}
                        </>
                      )}
                    </span>
                  </td>
                  <td className={`${td} text-right`}>
                    {i.status !== 'joined' && <ResendButton userId={i.userId} email={i.email} />}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <SimplePagination hrefFor={hrefFor} page={page} totalPages={meta.totalPages} total={meta.total} noun={['invite', 'invites']} />
      </Card>
    </>
  );
}
