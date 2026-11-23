import Link from 'next/link';
import { Card, Notice } from '@/components/dashboard/ui';
import { formatCycle, formatDate, formatTime } from '@/lib/format';
import { getProfitRunPlan, type InvestmentCheck, type SkipReason } from '@/lib/profit-run';
import { linkClass } from '../ui';
import { RunProfitButton } from './run-profit-button';

const SKIP_TEXT: Record<SkipReason, string> = {
  no_date: 'no investment date',
  not_counting_yet: 'still in its counting delay',
  no_rate: 'no monthly rate for its project',
  fixed_no_rate: 'fixed rate missing',
};

const monthName = (ymd: string) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ymd}T00:00:00Z`));

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Step 1 of a payout: the monthly profit run. Shown above "Prepare payout
// items" (step 2).
export async function ProfitRunCard({ returnTo }: { returnTo: string }) {
  const plan = await getProfitRunPlan(returnTo);

  if (!plan.configured) {
    return (
      <Card title="Monthly profit run">
        <div className="p-5">
          <Notice title="No profit cycle day set">
            Profit can’t be calculated until an admin sets the cycle day in{' '}
            <Link href="/admin/settings" className={linkClass}>
              Profit settings
            </Link>
            .
          </Notice>
        </div>
      </Card>
    );
  }

  const { cycle, checks } = plan;
  const cycleLabel = formatCycle(cycle.cycleStart, cycle.cycleEnd);
  const eligible = checks.filter((c) => c.skip === null);
  const skipped = checks.filter((c) => c.skip !== null);
  const missingRate = checks.filter((c) => c.skip === 'no_rate');
  const zeroRate = checks.filter((c) => c.zeroRate);
  const missingProjects = [
    ...new Map(missingRate.map((c) => [c.investment.projectId, c.investment.project.name])).entries(),
  ];
  const otherSkips = (Object.keys(SKIP_TEXT) as SkipReason[])
    .filter((r) => r !== 'no_rate')
    .map((r) => [r, skipped.filter((c) => c.skip === r)] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <Card
      title="Monthly profit run"
      description={`Step 1. Calculates each active investment’s profit for the cycle. It runs on day ${plan.cycleDay} of each month, and only on that day; nothing runs it automatically.`}
    >
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm leading-5 text-ink">
          {plan.isRunDay ? (
            <>
              <span className="font-semibold">Today is the run day.</span> This run covers {cycleLabel}
            </>
          ) : (
            <>
              Next run: <span className="font-semibold">{formatDate(cycle.runDate)}</span>, covering {cycleLabel}
            </>
          )}{' '}
          and uses {monthName(cycle.rateMonth)} rates for variable-rate investments.
        </p>

        <p className="text-sm leading-5 text-secondary">
          {plural(checks.length, 'active investment', 'active investments')}:{' '}
          {plural(eligible.length, 'gets', 'get')} profit
          {skipped.length > 0 && `, ${skipped.length} left out`}.
          {!plan.complete && ' (Too many investments to check them all; these counts may be short.)'}
        </p>

        {missingProjects.length > 0 && (
          <Notice title={`No ${monthName(cycle.rateMonth)} rate for ${plural(missingProjects.length, 'project', 'projects')}`}>
            {plural(missingRate.length, 'variable-rate investment gets', 'variable-rate investments get')} no profit
            this cycle unless a rate is set before the run, and it can’t be added afterwards:{' '}
            {missingProjects.map(([id, name], i) => (
              <span key={id}>
                {i > 0 && ', '}
                <Link href={`/admin/projects/${id}`} className={linkClass}>
                  {name}
                </Link>
              </span>
            ))}
            .{' '}
            <Link href="/admin/rates" className={linkClass}>
              Set monthly rates
            </Link>
          </Notice>
        )}

        {zeroRate.length > 0 && (
          <Notice title={`${plural(zeroRate.length, 'fixed-rate investment is', 'fixed-rate investments are')} at 0%`}>
            They get a profit row of ৳ 0: <InvestmentLinks checks={zeroRate} />.
          </Notice>
        )}

        {otherSkips.length > 0 && (
          <details className="text-sm leading-5">
            <summary className="cursor-pointer text-secondary">Other investments left out</summary>
            <ul className="mt-2 flex flex-col gap-1 text-secondary">
              {otherSkips.map(([reason, list]) => (
                <li key={reason}>
                  {plural(list.length, 'investment', 'investments')} with {SKIP_TEXT[reason]}: <InvestmentLinks checks={list} />
                </li>
              ))}
            </ul>
          </details>
        )}

        {plan.alreadyRun && (
          <Notice title="Already run for this cycle">
            Running it again is safe: investments already calculated aren’t counted twice.
          </Notice>
        )}

        {plan.isRunDay ? (
          <RunProfitButton cycleLabel={cycleLabel} eligible={eligible.length} />
        ) : (
          <div className="self-start">
            <button
              type="button"
              disabled
              className="h-10 cursor-not-allowed rounded-md bg-surface px-4 text-sm leading-5 text-muted"
            >
              Run monthly profit
            </button>
            <p className="mt-2 text-xs leading-4 text-muted">Available on {formatDate(cycle.runDate)}.</p>
          </div>
        )}
      </div>

      {plan.recentRuns.length > 0 && (
        <div className="border-t border-hairline px-5 py-4">
          <h3 className="pb-2 text-xs leading-4 tracking-[0.6px] text-muted uppercase">Recent runs</h3>
          <ul className="flex flex-col gap-2">
            {plan.recentRuns.map((n) => (
              <li key={n.id} className="text-sm leading-5 text-ink">
                <span className="text-muted">
                  {formatDate(n.createdAt)}, {formatTime(n.createdAt)}:
                </span>{' '}
                {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function InvestmentLinks({ checks }: { checks: InvestmentCheck[] }) {
  return (
    <>
      {checks.slice(0, 10).map((c, i) => (
        <span key={c.investment.id}>
          {i > 0 && ', '}
          <Link href={`/admin/investments/${c.investment.id}`} className={linkClass}>
            {c.investment.investor.fullname} ({c.investment.project.name})
          </Link>
        </span>
      ))}
      {checks.length > 10 && ` and ${checks.length - 10} more`}
    </>
  );
}
