import type { Metadata } from 'next';
import Link from 'next/link';
import { PayoutBadge, PayoutStatusBadge, payoutLabel } from '@/components/dashboard/labels';
import { Card, EmptyState, PageHeader, StatCard, Table, footnote, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { formatCycle, formatRate, formatTaka, sumTaka, yearOf } from '@/lib/format';
import { getInvestments, getLedger, requireInvestor } from '@/lib/investor';
import { groupPayouts, months, nextPayouts, nextPayoutText, payoutState } from '@/lib/payout-progress';

export const metadata: Metadata = {
  title: 'Profit history · HoneyComb Investor',
};

const selectClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-black';

const linkClass = 'text-secondary underline decoration-rule underline-offset-2 hover:text-black';

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfitPage(props: PageProps<'/dashboard/profit'>) {
  const { profile } = await requireInvestor('/dashboard/profit');
  const [investments, ledger, query] = await Promise.all([
    getInvestments('/dashboard/profit'),
    getLedger('/dashboard/profit'),
    props.searchParams,
  ]);

  // Only accept filter values that exist in the investor's own data.
  const years = [...new Set(ledger.map((r) => yearOf(r.cycleEnd)))].sort((a, b) => b - a);
  const yearParam = Number(one(query.year));
  const year = years.includes(yearParam) ? yearParam : years[0];
  const investmentParam = one(query.investment);
  const investment = investments.find((i) => i.id === investmentParam);
  const ofInvestment = (id: string) => !investment || id === investment.id;

  const rows = ledger.filter((r) => yearOf(r.cycleEnd) === year && ofInvestment(r.investmentId));
  const paid = rows.filter((r) => payoutState(r) === 'paid');
  const awaiting = rows.filter((r) => payoutState(r) !== 'paid');
  const beingPaid = sumTaka(rows.filter((r) => payoutState(r) === 'being_paid').map((r) => r.profitAmount));
  const byId = new Map(investments.map((i) => [i.id, i]));

  // A payout belongs to the year its last month ends in.
  const payouts = groupPayouts(ledger).filter((p) => yearOf(p.cycleEnd) === year && ofInvestment(p.investmentId));
  // Where things stand now, so not limited to the chosen year.
  const upcoming = nextPayouts(investments, ledger).filter((p) => ofInvestment(p.investment.id));
  const account = profile.bankAccount.find((a) => a.isActive);

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Profit history"
        description="Every monthly cycle on record, with the rate applied and the amount it was calculated on."
        actions={
          years.length > 0 && (
            <form className="flex flex-wrap items-center gap-2" action="/dashboard/profit">
              <label className="sr-only" htmlFor="year">
                Year
              </label>
              <select id="year" name="year" defaultValue={year} className={selectClass}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="investment">
                Investment
              </label>
              <select id="investment" name="investment" defaultValue={investment?.id ?? ''} className={selectClass}>
                <option value="">All investments</option>
                {investments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.project.name} — {formatTaka(i.amount)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-10 rounded-md bg-emphasis px-4 text-sm leading-5 text-white hover:bg-black/85"
              >
                Apply
              </button>
            </form>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Profit paid"
          value={formatTaka(sumTaka(paid.map((r) => r.profitAmount)))}
          hint={year ? `For cycles ending in ${year}` : 'Nothing paid yet'}
        />
        <StatCard
          label="Awaiting payout"
          value={formatTaka(sumTaka(awaiting.map((r) => r.profitAmount)))}
          hint={beingPaid > 0 ? `${formatTaka(beingPaid)} of it is being paid now` : 'Calculated, not paid yet'}
        />
        <StatCard
          label="Payout frequency"
          value={investment ? payoutLabel(investment.disbursementPeriod) : `${rows.length} cycles`}
          hint={investment ? 'Paid during each payout window' : 'Choose an investment to see its schedule'}
        />
      </div>

      {upcoming.length > 0 && (
        <Card
          title="Next payout"
          description="Profit is paid when enough months have built up for the investment’s payout schedule."
        >
          <Table
            minWidth={760}
            head={
              <tr>
                <th className={th}>Project</th>
                <th className={th}>Schedule</th>
                <th className={thNum}>Built up</th>
                <th className={th}>What happens next</th>
              </tr>
            }
          >
            {upcoming.map((p) => (
              <tr key={p.investment.id}>
                <td className={td}>
                  {p.investment.project.name}
                  <span className="block text-xs leading-4 text-muted">{formatTaka(p.investment.amount)} invested</span>
                </td>
                <td className={td}>{payoutLabel(p.investment.disbursementPeriod)}</td>
                <td className={tdNum}>
                  {formatTaka(p.builtAmount)}
                  <span className="block text-xs leading-4 text-muted">{months(p.built)}</span>
                </td>
                <td className={td}>
                  {nextPayoutText(p)}
                  {p.beingPaid > 0 && (
                    <span className="block text-xs leading-4 text-secondary">
                      Being paid now: {formatTaka(p.beingPaidAmount)} for {months(p.beingPaid)}.
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <p className="border-t border-hairline px-5 py-3 text-xs leading-5 text-muted">
            {account ? (
              <>
                Payouts go to your {account.bankName} account ending {account.accountNumber.slice(-4)}.{' '}
              </>
            ) : (
              <>You have no payout bank account on record, so profit can’t be paid yet. </>
            )}
            To change it, go to{' '}
            <Link href="/dashboard/profile" className={linkClass}>
              Profile
            </Link>
            . A payout already being paid goes to the account on record when it was prepared.
          </p>
        </Card>
      )}

      <Card
        title="Payouts"
        description="Each payout is one transfer to your bank account, covering one or more months of profit."
      >
        {payouts.length === 0 ? (
          <EmptyState
            title={year ? `No payouts for ${year} yet` : 'No payouts yet'}
            body="Your profit is added up here once it goes into a payout."
          />
        ) : (
          <Table
            minWidth={680}
            head={
              <tr>
                <th className={th}>Covers</th>
                <th className={th}>Project</th>
                <th className={thNum}>Months</th>
                <th className={thNum}>Amount</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {payouts.map((p) => (
              <tr key={p.id}>
                <td className={`${td} whitespace-nowrap`}>{formatCycle(p.cycleStart, p.cycleEnd)}</td>
                <td className={td}>{byId.get(p.investmentId)?.project.name ?? '—'}</td>
                <td className={tdNum}>{p.months}</td>
                <td className={`${tdNum} font-semibold`}>{formatTaka(p.amount)}</td>
                <td className={td}>
                  <PayoutBadge paid={p.paid} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Monthly profit" description="One row per monthly cycle.">
        {rows.length === 0 ? (
          <EmptyState
            title="No profit recorded yet"
            body="Your first profit will appear here after your investment completes its first monthly cycle."
          />
        ) : (
          <Table
            minWidth={860}
            head={
              <tr>
                <th className={th}>Cycle</th>
                <th className={th}>Project</th>
                <th className={thNum}>Days</th>
                <th className={thNum}>Rate</th>
                <th className={thNum}>Invested amount</th>
                <th className={thNum}>Profit</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap`}>{formatCycle(r.cycleStart, r.cycleEnd)}</td>
                <td className={td}>{byId.get(r.investmentId)?.project.name ?? '—'}</td>
                <td className={tdNum}>{r.daysCounted}</td>
                <td className={tdNum}>{formatRate(r.rateApplied)}</td>
                <td className={tdNum}>{formatTaka(r.principalAmount)}</td>
                <td className={`${tdNum} font-semibold`}>+ {formatTaka(r.profitAmount)}</td>
                <td className={td}>
                  <PayoutStatusBadge row={r} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <p className="text-xs leading-5 text-muted">
        {footnote} “Being paid” means the HoneyComb team has put the profit into a payout. It shows as paid once
        the bank confirms the transfer.
      </p>
    </>
  );
}
