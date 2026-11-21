import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ActionButton } from '@/components/admin/action-button';
import { DocumentLink } from '@/components/admin/document';
import { INVESTMENT_STATUS, INVESTOR_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, StatusBadge } from '@/components/admin/labels';
import { payoutLabel, rateLabel } from '@/components/dashboard/labels';
import { Card, Notice, PageHeader } from '@/components/dashboard/ui';
import { getInvestment, getInvestor, requireStaff, type AdminInvestment } from '@/lib/admin';
import { formatDate, formatTaka } from '@/lib/format';
import type { InvestorStatus } from '@/lib/investor';
import { HistoryLink } from '../../audit/ui';
import { ActivateForm } from './activate-form';

export const metadata: Metadata = {
  title: 'Investment · HoneyComb Admin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const link = 'underline decoration-rule underline-offset-2 hover:decoration-black';

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

export default async function AdminInvestmentPage(props: PageProps<'/admin/investments/[id]'>) {
  const { id } = await props.params;
  const returnTo = `/admin/investments/${id}`;
  const user = await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();

  const investment = await getInvestment(id, returnTo);
  if (!investment) notFound();
  const investor = await getInvestor(investment.investorId, returnTo);
  const payment = investment.incomingPayments;
  const amountMismatch = payment && Number(payment.amount) !== Number(investment.amount);

  return (
    <>
      <PageHeader
        eyebrow="Investment"
        title={`${formatTaka(investment.amount)} in ${investment.project.name}`}
        description={`Requested ${formatDate(investment.createdAt)} by ${investment.investor.fullname}`}
        actions={
          <>
            <StatusBadge labels={INVESTMENT_STATUS} status={investment.status} />
            <HistoryLink role={user.role} targetId={investment.id} />
          </>
        }
      />

      <StatusPanel investment={investment} investorStatus={investor?.status ?? null} />

      <Card title="Terms">
        <Details
          items={[
            [
              'Investor',
              <Link key="investor" href={`/admin/investors/${investment.investorId}`} className={link}>
                {investment.investor.fullname}
              </Link>,
            ],
            ['Project', investment.project.name],
            ['Amount', formatTaka(investment.amount)],
            ['Rate', rateLabel(investment)],
            ['Profit payout', payoutLabel(investment.disbursementPeriod)],
            ['Term', investment.investmentPeriodMonths ? `${investment.investmentPeriodMonths} months` : null],
            ['Investment date', investment.status === 'active' || investment.status === 'closed' ? formatDate(investment.investmentDate) : null],
            ['Agreement ends', formatDate(investment.agreementEndDate)],
            ['Agreement signed at', investment.agreementPlace],
            ['Special instruction', investment.specialInstruction],
          ]}
        />
      </Card>

      <Card
        title="Payment"
        action={payment && <StatusBadge labels={PAYMENT_STATUS} status={payment.status} />}
      >
        {payment ? (
          <>
            {amountMismatch && (
              <div className="px-5 pt-5">
                <Notice title="Amount doesn’t match">
                  The investor recorded {formatTaka(payment.amount)} but the investment is {formatTaka(investment.amount)}.
                </Notice>
              </div>
            )}
            <Details
              items={[
                ['Amount paid', formatTaka(payment.amount)],
                ['Method', PAYMENT_METHOD[payment.paymentMethod] ?? payment.paymentMethod],
                ['Paid from', payment.senderAccountInfo],
                ['Recorded', formatDate(payment.createdAt)],
                ['Confirmed', formatDate(payment.confirmedAt)],
                ['Receipt', <DocumentLink key="receipt" url={payment.screenshotUrl}>Open receipt</DocumentLink>],
              ]}
            />
            {payment.status !== 'confirmed' && (
              <p className="border-t border-hairline px-5 py-4 text-sm leading-5 text-muted">
                Confirm or mark this payment overdue from{' '}
                <Link href="/admin/payments" className={link}>
                  Payments
                </Link>
                .
              </p>
            )}
          </>
        ) : (
          <p className="p-5 text-sm leading-5 text-muted">The investor hasn’t recorded a payment yet.</p>
        )}
      </Card>
    </>
  );
}

// Next step for this investment, with the API's activation rules spelled
// out so the button is only offered when it can succeed.
function StatusPanel({
  investment,
  investorStatus,
}: {
  investment: AdminInvestment;
  investorStatus: InvestorStatus | null;
}) {
  const endpoint = `/api/admin/investment/${investment.id}`;

  if (investment.status === 'pending' || investment.status === 'rejected') {
    const paymentConfirmed = investment.incomingPayments?.status === 'confirmed';
    const investorActive = investorStatus === 'active';
    const blockers = [
      !paymentConfirmed &&
        (investment.incomingPayments
          ? 'Its payment hasn’t been confirmed yet.'
          : 'The investor hasn’t recorded a payment yet.'),
      !investorActive &&
        `The investor isn’t active (${investorStatus ? INVESTOR_STATUS[investorStatus][0].toLowerCase() : 'unknown'}).`,
    ].filter((b): b is string => !!b);

    return (
      <Card title={investment.status === 'rejected' ? 'Rejected — activate instead?' : 'Activate investment'}>
        <div className="flex flex-col gap-6 p-5">
          {blockers.length > 0 ? (
            <Notice title="Can’t activate yet">
              <ul className="list-disc pl-5">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <ActivateForm investmentId={investment.id} termMonths={investment.investmentPeriodMonths} />
          )}
          {investment.status === 'pending' && (
            <div className="flex flex-col gap-2 border-t border-hairline pt-5">
              <p className="text-sm leading-5 text-muted">Not going ahead with this request?</p>
              <div className="self-start">
                <ActionButton
                  endpoint={endpoint}
                  body={{ status: 'rejected' }}
                  label="Reject request"
                  confirm="The investor will see this request as rejected."
                  variant="secondary"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (investment.status === 'active') {
    return (
      <Card title="Investment is active">
        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm leading-5 text-muted">
            Close it when the agreement has ended. Closing is final and can’t be undone.
          </p>
          <div className="self-start">
            <ActionButton
              endpoint={endpoint}
              body={{ status: 'closed' }}
              label="Close investment"
              confirm="Closing is final."
              variant="secondary"
            />
          </div>
        </div>
      </Card>
    );
  }

  return <Notice title="Investment is closed">This record is final.</Notice>;
}
