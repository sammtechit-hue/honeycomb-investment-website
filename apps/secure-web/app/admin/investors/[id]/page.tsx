import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ActionButton } from '@/components/admin/action-button';
import { DocumentTile } from '@/components/admin/document';
import { INVESTMENT_STATUS, INVESTOR_STATUS, KYC_STATUS, PAYMENT_STATUS, StatusBadge } from '@/components/admin/labels';
import { payoutLabel } from '@/components/dashboard/labels';
import { categoryLabel } from '@/components/dashboard/shell';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { getInvestor, listInvestments, requireStaff, type AdminBankAccount, type AdminInvestor } from '@/lib/admin';
import { formatDate, formatTaka } from '@/lib/format';
import { HistoryLink } from '../../audit/ui';
import { InvestorReferrals } from '../../referrals/investor-referrals';
import { ApproveForm, CategoryForm, RejectForm } from './investor-forms';

export const metadata: Metadata = {
  title: 'Investor · HoneyComb Admin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function bankLine(b: AdminBankAccount) {
  return [
    ['Bank', b.bankName],
    ['Branch', b.branchName],
    ['Account holder', b.accountName],
    ['Account number', b.accountNumber],
    ['Routing number', b.routingNumber],
    ['Account type', b.accountType ? (b.accountType === 'savings' ? 'Savings' : 'Current') : null],
    ['Transfer', b.selectedBank === 'city_bank' ? 'City Bank (direct)' : 'BEFTN'],
  ] as [string, ReactNode][];
}

export default async function AdminInvestorPage(props: PageProps<'/admin/investors/[id]'>) {
  const { id } = await props.params;
  const returnTo = `/admin/investors/${id}`;
  const user = await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();

  const investor = await getInvestor(id, returnTo);
  if (!investor) notFound();
  const investments = (
    await listInvestments(
      new URLSearchParams({ investorId: id, limit: '100', sortBy: 'createdAt', sortOrder: 'desc' }),
      returnTo,
    )
  ).data;

  return (
    <>
      <PageHeader
        eyebrow="Investor"
        title={investor.fullname}
        description={`Signed up ${formatDate(investor.createdAt)}${
          investor.approvedAt ? ` · approved ${formatDate(investor.approvedAt)}` : ''
        }`}
        actions={
          <>
            <StatusBadge labels={INVESTOR_STATUS} status={investor.status} />
            <Badge tone="outline">{categoryLabel(investor.category)}</Badge>
            <HistoryLink role={user.role} targetId={investor.id} />
          </>
        }
      />

      <ReviewPanel investor={investor} />

      <Card title="Profile">
        <Details
          items={[
            ['Email', investor.user.email],
            ['Mobile', investor.user.phone],
            ['NID number', investor.nidNumber],
            ['Address', investor.address],
            ['Profession', investor.profession],
            ['Workplace', investor.workplace],
            ['Total invested', formatTaka(investor.totalInvestmentAmount)],
            ['Last sign-in', formatDate(investor.user.lastLoginAt)],
          ]}
        />
      </Card>

      <Card
        title="Identity documents"
        action={investor.kycDocuments && <StatusBadge labels={KYC_STATUS} status={investor.kycDocuments.verificationStatus} />}
      >
        {investor.kycDocuments ? (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <DocumentTile label="NID front" url={investor.kycDocuments.nidFront} />
            <DocumentTile label="NID back" url={investor.kycDocuments.nidBack} />
            <DocumentTile label="Photo" url={investor.kycDocuments.photo} />
          </div>
        ) : (
          <p className="p-5 text-sm leading-5 text-muted">The investor hasn’t submitted documents yet.</p>
        )}
      </Card>

      <Card title="Nominee">
        {investor.nominee ? (
          <>
            <Details
              items={[
                ['Name', investor.nominee.nomineeName],
                ['Relation', investor.nominee.relation],
                ['Mobile', investor.nominee.nomineePhone],
                ['NID number', investor.nominee.nomineeNidNumber],
              ]}
            />
            <div className="grid grid-cols-1 gap-4 border-t border-hairline p-5 sm:grid-cols-3">
              <DocumentTile label="Nominee NID front" url={investor.nominee.nomineeNidFront} />
              <DocumentTile label="Nominee NID back" url={investor.nominee.nomineeNidBack} />
              <DocumentTile label="Nominee photo" url={investor.nominee.nomineePhoto} />
            </div>
          </>
        ) : (
          <p className="p-5 text-sm leading-5 text-muted">No nominee on record.</p>
        )}
      </Card>

      <Card title="Bank accounts" description="Profit and withdrawals go to the payout account">
        {investor.bankAccount.length === 0 ? (
          <p className="p-5 text-sm leading-5 text-muted">No bank account on record.</p>
        ) : (
          <div className="divide-y divide-hairline">
            {investor.bankAccount.map((b) => (
              <div key={b.id} className="flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                  {b.isActive ? <Badge tone="solid">Payout account</Badge> : <Badge>Not in use</Badge>}
                  {!b.isActive && (
                    <ActionButton
                      endpoint={`/api/admin/investor/bank-account/${b.id}`}
                      body={{ isActive: true }}
                      label="Make payout account"
                      confirm="Future payouts go to this account."
                      variant="secondary"
                    />
                  )}
                </div>
                <Details items={bankLine(b)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Investments">
        {investments.length === 0 ? (
          <EmptyState title="No investments yet" body="Investment requests from this investor will show here." />
        ) : (
          <Table
            minWidth={760}
            head={
              <tr>
                <th className={th}>Project</th>
                <th className={thNum}>Amount</th>
                <th className={th}>Payout</th>
                <th className={th}>Payment</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {investments.map((i) => (
              <tr key={i.id}>
                <td className={td}>
                  <Link
                    href={`/admin/investments/${i.id}`}
                    className="underline decoration-rule underline-offset-2 hover:decoration-black"
                  >
                    {i.project.name}
                  </Link>
                  <span className="block text-xs leading-4 text-muted">Requested {formatDate(i.createdAt)}</span>
                </td>
                <td className={tdNum}>{formatTaka(i.amount)}</td>
                <td className={td}>{payoutLabel(i.disbursementPeriod)}</td>
                <td className={td}>
                  {i.incomingPayments ? (
                    <StatusBadge labels={PAYMENT_STATUS} status={i.incomingPayments.status} />
                  ) : (
                    <Badge tone="outline">Not submitted</Badge>
                  )}
                </td>
                <td className={td}>
                  <StatusBadge labels={INVESTMENT_STATUS} status={i.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <InvestorReferrals investorId={investor.id} returnTo={returnTo} />
    </>
  );
}

// What the team can do with this investor right now, by status.
function ReviewPanel({ investor }: { investor: AdminInvestor }) {
  const endpoint = `/api/admin/investor/${investor.id}`;

  if (investor.status === 'rejected') {
    return (
      <Notice title="Sent back to the investor">
        <span className="block">
          {investor.rejectedAt ? `On ${formatDate(investor.rejectedAt)}` : 'Earlier'}, with this note:
        </span>
        <span className="mt-1 block whitespace-pre-line text-ink">{investor.rejectionReason ?? '—'}</span>
        <span className="mt-2 block">
          The application can’t be changed or approved until the investor edits and resubmits it.
        </span>
      </Notice>
    );
  }

  if (investor.status === 'pending' || investor.status === 'uploaded_kyc') {
    if (!investor.kycDocuments) {
      return (
        <Notice title="Waiting for the investor">
          They haven’t submitted their verification details yet, so there is nothing to review.
        </Notice>
      );
    }
    return (
      <Card
        title="Review the application"
        description="Check the details, documents, bank account and the investment below. To approve, copy both NID numbers from the NID images. If anything is wrong, send it back with a note and the investor can fix it."
      >
        <div className="flex flex-col gap-6 p-5">
          {investor.nominee ? (
            <ApproveForm
              investorId={investor.id}
              initial={{
                nidNumber: investor.nidNumber ?? '',
                nomineeNidNumber: investor.nominee.nomineeNidNumber ?? '',
                category: investor.category,
              }}
            />
          ) : (
            <Notice title="No nominee on record">
              Approval needs the nominee’s NID number, and this investor has no nominee yet.
            </Notice>
          )}
          <div className="flex flex-col gap-3 border-t border-hairline pt-5">
            <p className="text-sm leading-5 text-muted">
              Documents unreadable, details not matching, or the investment needs changing? Send the application
              back with a note.
            </p>
            <RejectForm investorId={investor.id} />
          </div>
        </div>
      </Card>
    );
  }

  if (investor.status === 'active') {
    return (
      <Card title="Manage investor">
        <div className="flex flex-col gap-6 p-5">
          <CategoryForm investorId={investor.id} category={investor.category} />
          <div className="flex flex-col gap-3 border-t border-hairline pt-5">
            <p className="text-sm leading-5 text-muted">
              Suspending or deactivating is only possible once all of this investor’s investments are closed.
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                endpoint={endpoint}
                body={{ status: 'suspended' }}
                label="Suspend"
                confirm="The investor won’t be able to invest."
                variant="secondary"
              />
              <ActionButton
                endpoint={`${endpoint}/deactivate`}
                body={{}}
                label="Deactivate"
                confirm="Deactivation is permanent."
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (investor.status === 'suspended') {
    return (
      <Card title="Investor is suspended">
        <div className="flex flex-wrap gap-3 p-5">
          <ActionButton endpoint={endpoint} body={{ status: 'active' }} label="Reactivate" confirm="The investor can invest again." />
          <ActionButton
            endpoint={`${endpoint}/deactivate`}
            body={{}}
            label="Deactivate"
            confirm="Deactivation is permanent."
            variant="secondary"
          />
        </div>
      </Card>
    );
  }

  return <Notice title="Investor is deactivated">Their records stay here for reference. Nothing can be changed.</Notice>;
}
