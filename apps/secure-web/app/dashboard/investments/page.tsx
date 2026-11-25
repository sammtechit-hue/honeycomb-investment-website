import type { Metadata } from 'next';
import Link from 'next/link';
import { primaryButtonClass, rowActionClass } from '@/components/dashboard/form';
import { InvestmentStatusBadge, PaymentStatusBadge, payoutLabel, rateLabel } from '@/components/dashboard/labels';
import { Card, EmptyState, Notice, PageHeader, Table, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { daysUntil, formatDate, formatTaka } from '@/lib/format';
import { getInvestments, requireInvestor, type Investment } from '@/lib/investor';

export const metadata: Metadata = {
  title: 'My investments · HoneyComb Investor',
};

function daysLeftLabel(endDate: string | null) {
  const days = daysUntil(endDate);
  if (days === null) return null;
  return days > 0 ? `${days} days left` : 'Agreement ended';
}

const SUBMITTED = {
  investment: [
    'Investment request submitted',
    'Next, send your payment and use “Submit payment” on the new row to upload the proof.',
  ],
  payment: ['Payment submitted for review', 'We’ll confirm it once the money reaches HoneyComb’s account.'],
} as const;

// What the investor can do next with this investment, if anything.
function RowAction({ investment, canInvest }: { investment: Investment; canInvest: boolean }) {
  if (!investment.incomingPayments && investment.status === 'pending') {
    return (
      <Link href={`/dashboard/investments/${investment.id}/pay`} className={rowActionClass}>
        Submit payment
      </Link>
    );
  }
  if (investment.status === 'active' && canInvest) {
    return (
      <Link href={`/dashboard/invest?project=${investment.projectId}`} className={rowActionClass}>
        Top up
      </Link>
    );
  }
  return null;
}

export default async function InvestmentsPage(props: PageProps<'/dashboard/investments'>) {
  const { profile } = await requireInvestor('/dashboard/investments');
  const [investments, query] = await Promise.all([getInvestments('/dashboard/investments'), props.searchParams]);
  const canInvest = profile.status === 'active';
  const submitted = SUBMITTED[query.submitted as keyof typeof SUBMITTED];

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="My investments"
        description="Each top-up is its own investment with its own date, so its profit is calculated separately."
        actions={
          canInvest && (
            <Link href="/dashboard/invest" className={primaryButtonClass}>
              Invest
            </Link>
          )
        }
      />

      {submitted && <Notice title={submitted[0]}>{submitted[1]}</Notice>}

      <Card>
        {investments.length === 0 ? (
          <EmptyState
            title="No investments yet"
            body="Once you invest in a project, its amount, rate, payout schedule and agreement dates will show here."
            action={
              canInvest && (
                <Link href="/dashboard/invest" className={primaryButtonClass}>
                  Invest in a project
                </Link>
              )
            }
          />
        ) : (
          <Table
            minWidth={1080}
            head={
              <tr>
                <th className={th}>Project</th>
                <th className={thNum}>Amount</th>
                <th className={th}>Rate</th>
                <th className={th}>Payout</th>
                <th className={th}>Started</th>
                <th className={th}>Agreement ends</th>
                <th className={th}>Payment</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
          >
            {investments.map((i) => (
              <tr key={i.id}>
                <td className={`${td} font-semibold`}>{i.project.name}</td>
                <td className={tdNum}>{formatTaka(i.amount)}</td>
                <td className={td}>{rateLabel(i)}</td>
                <td className={td}>
                  {payoutLabel(i.disbursementPeriod)}
                  {i.investmentPeriodMonths && (
                    <span className="block text-xs leading-4 text-muted">{i.investmentPeriodMonths}-month term</span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {/* The API stores the request date as a placeholder and re-stamps it on activation,
                      so it only means "started" once active (same rule as the admin page). */}
                  {i.status === 'active' || i.status === 'closed' ? formatDate(i.investmentDate) : '—'}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {formatDate(i.agreementEndDate)}
                  {i.status === 'active' && daysLeftLabel(i.agreementEndDate) && (
                    <span className="block text-xs leading-4 text-muted">{daysLeftLabel(i.agreementEndDate)}</span>
                  )}
                </td>
                <td className={td}>
                  <PaymentStatusBadge payment={i.incomingPayments} />
                </td>
                <td className={td}>
                  <InvestmentStatusBadge status={i.status} />
                </td>
                <td className={`${td} text-right`}>
                  <RowAction investment={i} canInvest={canInvest} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
