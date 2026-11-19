import Link from 'next/link';
import { primaryButtonClass } from '@/components/dashboard/form';
import {
  InvestmentStatusBadge,
  PaymentStatusBadge,
  PayoutStatusBadge,
  payoutLabel,
} from '@/components/dashboard/labels';
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
  Table,
  td,
  tdNum,
  th,
  thNum,
} from '@/components/dashboard/ui';
import { daysUntil, formatCycle, formatDate, formatRate, formatTaka, sumTaka } from '@/lib/format';
import { getInvestments, getLedger, requireInvestor, type InvestorProfile } from '@/lib/investor';

const linkClass = 'text-sm leading-5 text-secondary underline decoration-rule underline-offset-2 hover:text-black';

export default async function OverviewPage() {
  const { profile } = await requireInvestor('/dashboard');
  const [investments, ledger] = await Promise.all([getInvestments('/dashboard'), getLedger('/dashboard')]);

  const active = investments.filter((i) => i.status === 'active');
  const received = sumTaka(ledger.filter((r) => r.payoutStatus === 'disbursed').map((r) => r.profitAmount));
  const awaiting = ledger.filter((r) => r.payoutStatus === 'accrued');
  const nextEnd = active
    .filter((i) => i.agreementEndDate)
    .sort((a, b) => a.agreementEndDate!.localeCompare(b.agreementEndDate!))[0];
  const daysLeft = daysUntil(nextEnd?.agreementEndDate);
  const projectName = new Map(investments.map((i) => [i.id, i.project.name]));

  return (
    <>
      <PageHeader
        eyebrow="Investor portal"
        title={`Welcome, ${profile.fullname.split(' ')[0]}`}
        description="Your investments, profit and payouts at a glance."
        actions={
          profile.status === 'active' && (
            <Link href="/dashboard/invest" className={primaryButtonClass}>
              Invest
            </Link>
          )
        }
      />

      <AccountNotice profile={profile} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active investment"
          value={formatTaka(sumTaka(active.map((i) => i.amount)))}
          hint={`Across ${active.length} active ${active.length === 1 ? 'investment' : 'investments'}`}
        />
        <StatCard label="Profit received" value={formatTaka(received)} hint="Sent to your bank account" />
        <StatCard
          label="Awaiting payout"
          value={formatTaka(sumTaka(awaiting.map((r) => r.profitAmount)))}
          hint={`${awaiting.length} ${awaiting.length === 1 ? 'month' : 'months'} calculated, not yet sent`}
        />
        <StatCard
          label="Agreement days left"
          value={daysLeft === null ? '—' : `${Math.max(daysLeft, 0)} days`}
          hint={nextEnd ? `${nextEnd.project.name} ends ${formatDate(nextEnd.agreementEndDate)}` : 'No active agreement'}
        />
      </div>

      <Card
        title="My investments"
        action={
          investments.length > 0 && (
            <Link href="/dashboard/investments" className={linkClass}>
              View all
            </Link>
          )
        }
      >
        {investments.length === 0 ? (
          <EmptyState
            title="No investments yet"
            body="Once you invest in a project, its amount, payout schedule and agreement dates will show here."
          />
        ) : (
          <Table
            minWidth={680}
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
            {investments.slice(0, 5).map((i) => (
              <tr key={i.id}>
                <td className={td}>{i.project.name}</td>
                <td className={tdNum}>{formatTaka(i.amount)}</td>
                <td className={td}>{payoutLabel(i.disbursementPeriod)}</td>
                <td className={td}>
                  <PaymentStatusBadge payment={i.incomingPayments} />
                </td>
                <td className={td}>
                  <InvestmentStatusBadge status={i.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title="Recent profit"
        description="One row per monthly cycle"
        action={
          ledger.length > 0 && (
            <Link href="/dashboard/profit" className={linkClass}>
              Full history
            </Link>
          )
        }
      >
        {ledger.length === 0 ? (
          <EmptyState
            title="No profit recorded yet"
            body="Your first profit will appear here after your investment completes its first monthly cycle."
          />
        ) : (
          <Table
            minWidth={680}
            head={
              <tr>
                <th className={th}>Cycle</th>
                <th className={th}>Project</th>
                <th className={thNum}>Rate</th>
                <th className={thNum}>Profit</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {ledger.slice(0, 6).map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap`}>{formatCycle(r.cycleStart, r.cycleEnd)}</td>
                <td className={td}>{projectName.get(r.investmentId) ?? '—'}</td>
                <td className={tdNum}>{formatRate(r.rateApplied)}</td>
                <td className={tdNum}>+ {formatTaka(r.profitAmount)}</td>
                <td className={td}>
                  <PayoutStatusBadge status={r.payoutStatus} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

function AccountNotice({ profile }: { profile: InvestorProfile }) {
  if (profile.status === 'active') return null;

  if (profile.status === 'suspended' || profile.status === 'deactivated') {
    return (
      <Notice title="Your account is on hold">
        Please contact HoneyComb support to find out more. Your records stay available here.
      </Notice>
    );
  }

  const rejected = profile.kycDocuments?.verificationStatus === 'rejected';
  return (
    <Notice title={rejected ? 'We couldn’t verify your documents' : 'Verification in review'}>
      {rejected
        ? 'Our verification team will contact you about what needs to change.'
        : 'Our team is checking your details and documents. You can invest once your account is verified.'}{' '}
      <Link href="/verification" className="underline underline-offset-2">
        View verification status
      </Link>
    </Notice>
  );
}
