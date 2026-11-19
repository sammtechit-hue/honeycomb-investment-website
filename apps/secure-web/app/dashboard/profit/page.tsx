import type { Metadata } from 'next';
import { PayoutStatusBadge, payoutLabel } from '@/components/dashboard/labels';
import { Card, EmptyState, PageHeader, StatCard, Table, footnote, td, tdNum, th, thNum } from '@/components/dashboard/ui';
import { formatCycle, formatRate, formatTaka, sumTaka, yearOf } from '@/lib/format';
import { getInvestments, getLedger, requireInvestor } from '@/lib/investor';

export const metadata: Metadata = {
  title: 'Profit history · HoneyComb Investor',
};

const selectClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-black';

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfitPage(props: PageProps<'/dashboard/profit'>) {
  await requireInvestor('/dashboard/profit');
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

  const rows = ledger.filter(
    (r) => yearOf(r.cycleEnd) === year && (!investment || r.investmentId === investment.id),
  );
  const sent = rows.filter((r) => r.payoutStatus === 'disbursed');
  const awaiting = rows.filter((r) => r.payoutStatus === 'accrued');
  const byId = new Map(investments.map((i) => [i.id, i]));

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
          label="Profit received"
          value={formatTaka(sumTaka(sent.map((r) => r.profitAmount)))}
          hint={year ? `Sent in cycles ending ${year}` : 'Nothing sent yet'}
        />
        <StatCard
          label="Awaiting payout"
          value={formatTaka(sumTaka(awaiting.map((r) => r.profitAmount)))}
          hint="Calculated, waiting for the payout window"
        />
        <StatCard
          label="Payout frequency"
          value={investment ? payoutLabel(investment.disbursementPeriod) : `${rows.length} cycles`}
          hint={investment ? 'Sent during each payout window' :'Choose an investment to see its schedule'}
        />
      </div>

      <Card>
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
                  <PayoutStatusBadge status={r.payoutStatus} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <p className="text-xs leading-5 text-muted">{footnote}</p>
    </>
  );
}
