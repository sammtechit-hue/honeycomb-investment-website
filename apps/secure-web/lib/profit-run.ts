import { getActiveBusinessSettings, type AdminInvestment, type AdminMonthlyRate } from './admin';
import { getEvery, getPage } from './server-api';

// The monthly profit run (POST /admin/monthly-profit-ledger): one ledger row
// of profit per active investment per cycle. Payout items are made from
// those rows, so nothing can be paid until the run has happened.
//
// The API only accepts the run on the cycle day (Bangladesh date), and
// nothing runs it automatically. This module works out the cycle the next
// run covers and checks, ahead of time, which investments it will skip.
// The rules mirror createMonthlyLedger in
// apps/api/src/admin/monthly-profit-ledger/monthly-profit-ledger.service.ts.

// A calendar date as UTC midnight, the way the API handles dates.
type Day = Date;

const ymd = (d: Day) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, day: number): Day => new Date(Date.UTC(y, m, day));
const addDays = (d: Day, n: number): Day => utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n);

export function dhakaToday(now = new Date()): Day {
  return new Date(`${now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })}T00:00:00Z`);
}

export type RunCycle = {
  // The day the run happens (and must be pressed).
  runDate: string;
  cycleStart: string;
  cycleEnd: string;
  // First day of the month whose variable rates the run uses.
  rateMonth: string;
};

// The cycle a run on `runDate` covers. cycleEnd is the day before the run;
// the standard cycle starts on the cycle day of the month before cycleEnd's.
export function cycleFor(runDate: Day, cycleDay: number): RunCycle {
  const cycleEnd = addDays(runDate, -1);
  const cycleStart = utc(cycleEnd.getUTCFullYear(), cycleEnd.getUTCMonth() - 1, cycleDay);
  const rateMonth = utc(runDate.getUTCFullYear(), runDate.getUTCMonth() - 1, 1);
  return { runDate: ymd(runDate), cycleStart: ymd(cycleStart), cycleEnd: ymd(cycleEnd), rateMonth: ymd(rateMonth) };
}

// Today if it's the cycle day, otherwise the next one.
export function nextRunDate(today: Day, cycleDay: number): Day {
  const thisMonth = utc(today.getUTCFullYear(), today.getUTCMonth(), cycleDay);
  return thisMonth.getTime() >= today.getTime()
    ? thisMonth
    : utc(today.getUTCFullYear(), today.getUTCMonth() + 1, cycleDay);
}

export type SkipReason = 'no_date' | 'not_counting_yet' | 'no_rate' | 'fixed_no_rate';

export type InvestmentCheck = {
  investment: AdminInvestment;
  // null: gets a ledger row this run.
  skip: SkipReason | null;
  // A fixed rate of 0% still gets a row, with no profit.
  zeroRate: boolean;
};

// What the run will do with each active investment.
export function checkInvestments(
  investments: AdminInvestment[],
  rates: AdminMonthlyRate[],
  cycle: RunCycle,
  countingDelayDays: number,
): InvestmentCheck[] {
  const cycleEnd = new Date(`${cycle.cycleEnd}T00:00:00Z`).getTime();
  const rated = new Set(
    rates.filter((r) => r.isActive && r.periodMonth.slice(0, 10) === cycle.rateMonth).map((r) => r.projectId),
  );
  return investments.map((investment) => {
    const check = (skip: SkipReason | null, zeroRate = false) => ({ investment, skip, zeroRate });
    if (!investment.investmentDate) return check('no_date');
    const invested = new Date(`${investment.investmentDate.slice(0, 10)}T00:00:00Z`);
    if (addDays(invested, countingDelayDays).getTime() > cycleEnd) return check('not_counting_yet');
    if (investment.investmentType !== 'fixed') return check(rated.has(investment.projectId) ? null : 'no_rate');
    if (investment.rate == null) return check('fixed_no_rate');
    return check(null, Number(investment.rate) === 0);
  });
}

export type RunNotification = { id: string; type: string; message: string; createdAt: string; clickLink: string | null };

export type ProfitRunPlan =
  | { configured: false }
  | {
      configured: true;
      cycleDay: number;
      countingDelayDays: number;
      today: string;
      isRunDay: boolean;
      cycle: RunCycle;
      checks: InvestmentCheck[];
      // The investment list was read in full (it stops at 5,000).
      complete: boolean;
      // A run for this cycle is already on record (from its notification).
      alreadyRun: boolean;
      recentRuns: RunNotification[];
    };

export async function getProfitRunPlan(returnTo: string): Promise<ProfitRunPlan> {
  const settings = await getActiveBusinessSettings(returnTo);
  // The API refuses to run without a cycle day.
  if (!settings?.setcycleday) return { configured: false };
  const cycleDay = settings.setcycleday;
  // The API falls back to 10 days when the column is empty.
  const countingDelayDays = settings.countingStartAfterDays ?? 10;

  const today = dhakaToday();
  const runDate = nextRunDate(today, cycleDay);
  const cycle = cycleFor(runDate, cycleDay);

  const [investments, rates, notifications] = await Promise.all([
    getEvery<AdminInvestment>('/admin/investment', { status: 'active', sortBy: 'createdAt', sortOrder: 'asc' }, returnTo),
    getEvery<AdminMonthlyRate>('/admin/monthly-rate-setting', { sortBy: 'periodMonth', sortOrder: 'desc' }, returnTo),
    // Mounted at /admin-notification, not under /admin.
    getPage<RunNotification>(
      '/admin-notification',
      new URLSearchParams({ type: 'monthly_profit_cycle', limit: '6', sortBy: 'createdAt', sortOrder: 'desc' }),
      returnTo,
    ),
  ]);
  const runs = notifications.data;

  return {
    configured: true,
    cycleDay,
    countingDelayDays,
    today: ymd(today),
    isRunDay: ymd(today) === cycle.runDate,
    cycle,
    checks: checkInvestments(investments.rows, rates.rows, cycle, countingDelayDays),
    complete: investments.complete && rates.complete,
    // The run's notifications say "cycle ending YYYY-MM-DD".
    alreadyRun: runs.some((n) => n.message.includes(`cycle ending ${cycle.cycleEnd}`)),
    recentRuns: runs,
  };
}
