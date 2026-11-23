import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { rowActionClass, secondaryButtonClass } from '@/components/dashboard/form';
import { categoryLabel } from '@/components/dashboard/shell';
import { Badge, Card, Notice, PageHeader, Table, td, th, type BadgeTone } from '@/components/dashboard/ui';
import { formatDate } from '@/lib/format';
import { getEditRequests, requireInvestor, type EditRequest, type EditRequestStatus } from '@/lib/investor';

export const metadata: Metadata = {
  title: 'Profile · HoneyComb Investor',
};

function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
      {items.map(([term, value]) => (
        <div key={term} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{term}</dt>
          <dd className="text-sm leading-5 break-words text-ink">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// Last four digits only; the full number is on the bank's own records.
function maskAccount(number: string) {
  return number.length > 4 ? `•••• ${number.slice(-4)}` : number;
}

const REQUEST_STATUS: Record<EditRequestStatus, [string, BadgeTone]> = {
  PENDING: ['In review', 'muted'],
  APPROVED: ['Approved', 'solid'],
  REJECTED: ['Not approved', 'outline'],
};

// "Address, Nominee mobile" — which fields a request asked to change.
function requestedFields(request: EditRequest) {
  const fields: string[] = [];
  const inv = request.editableInvestor;
  const nom = request.editableNominee;
  if (inv?.address) fields.push('Address');
  if (inv?.profession) fields.push('Profession');
  if (inv?.workplace) fields.push('Workplace');
  if (nom?.nomineeName) fields.push('Nominee name');
  if (nom?.relation) fields.push('Nominee relation');
  if (nom?.nomineePhone) fields.push('Nominee mobile');
  return fields.length ? fields.join(', ') : 'Profile details';
}

const SUBMITTED = {
  changes: ['Change request submitted', 'Your profile updates once our team approves it.'],
  bank: ['Bank account submitted', 'Payouts keep going to your current account until our team approves the new one.'],
} as const;

export default async function ProfilePage(props: PageProps<'/dashboard/profile'>) {
  const { profile } = await requireInvestor('/dashboard/profile');
  const [requests, query] = await Promise.all([getEditRequests('/dashboard/profile'), props.searchParams]);
  const bank = profile.bankAccount.find((b) => b.isActive) ?? profile.bankAccount[0];
  const inReview = profile.bankAccount.filter((b) => !b.isActive && b !== bank);
  const submitted = SUBMITTED[query.submitted as keyof typeof SUBMITTED];

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Changes you request are checked by our team before they apply."
        actions={
          <>
            {profile.status === 'active' ? <Badge tone="solid">Verified</Badge> : <Badge>Not yet verified</Badge>}
            <Link href="/dashboard/profile/edit" className={secondaryButtonClass}>
              Request changes
            </Link>
          </>
        }
      />

      {submitted && <Notice title={submitted[0]}>{submitted[1]}</Notice>}

      <Card title="Personal information">
        <Details
          items={[
            ['Full name', profile.fullname],
            ['Category', profile.category ? `${categoryLabel(profile.category)} tier` : null],
            ['Mobile number', profile.user.phone],
            ['Email', profile.user.email],
            ['Profession', profile.profession],
            ['Workplace', profile.workplace],
            ['Address', profile.address],
            ['Member since', formatDate(profile.approvedAt ?? profile.createdAt)],
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card
          title="Bank details"
          description="Profit and withdrawals are sent to this account"
          action={
            <Link href="/dashboard/profile/bank" className={rowActionClass}>
              Add account
            </Link>
          }
        >
          {bank ? (
            <Details
              items={[
                ['Bank', bank.bankName],
                ['Branch', bank.branchName],
                ['Account holder', bank.accountName],
                ['Account number', maskAccount(bank.accountNumber)],
                ['Routing number', bank.routingNumber],
                ['Account type', bank.accountType ? (bank.accountType === 'savings' ? 'Savings' : 'Current') : null],
              ]}
            />
          ) : (
            <p className="p-5 text-sm leading-5 text-muted">No bank account on record yet.</p>
          )}
          {inReview.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-hairline px-5 py-4">
              {inReview.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 text-sm leading-5">
                  <span className="min-w-0 truncate">
                    {b.bankName} · {maskAccount(b.accountNumber)}
                  </span>
                  <Badge>In review</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Nominee"
          action={
            <Link href="/dashboard/profile/edit" className={rowActionClass}>
              Change
            </Link>
          }
        >
          {profile.nominee ? (
            <Details
              items={[
                ['Name', profile.nominee.nomineeName],
                ['Relation', profile.nominee.relation],
                ['Mobile number', profile.nominee.nomineePhone],
              ]}
            />
          ) : (
            <p className="p-5 text-sm leading-5 text-muted">No nominee on record yet.</p>
          )}
        </Card>
      </div>

      {requests.length > 0 && (
        <Card title="Change requests" description="Your latest requests and their review status">
          <Table
            minWidth={620}
            head={
              <tr>
                <th className={th}>Submitted</th>
                <th className={th}>Changes</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {requests.map((r) => {
              const [label, tone] = REQUEST_STATUS[r.status];
              return (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                  <td className={td}>
                    {requestedFields(r)}
                    {r.status === 'REJECTED' && r.rejectionReason && (
                      <span className="block text-xs leading-4 text-muted">Reason: {r.rejectionReason}</span>
                    )}
                  </td>
                  <td className={td}>
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
