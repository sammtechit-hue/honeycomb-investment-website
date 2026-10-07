// Projection maths for the public ROI calculator.
//
// Mirrors the profit engine rules in the requirements brief (section 5):
//   Profit = Invested Amount × that month's rate
// on the ORIGINAL amount, never compounded. A quarterly or yearly payout is
// the SUM of the separate monthly amounts — never an averaged rate.
//
// Rates here are display defaults only. The real rates are set by the admin
// (fixed ≈ 2.5%, variable 2.0–2.5% chosen each month); once the API exposes
// them publicly, read them from there instead of these constants.
//
// Rates are stored in basis points (1 bp = 0.01%) so all money maths stays
// in integers and never picks up floating-point drift.

export type InvestmentType = 'fixed' | 'unfixed';
export type PayoutFrequency = 'monthly' | 'quarterly' | 'yearly';

export const FIXED_RATE_BPS = 250;
export const VARIABLE_RATE_MIN_BPS = 200;
export const VARIABLE_RATE_MAX_BPS = 250;

export const TERM_OPTIONS_MONTHS = [12, 18, 24, 36] as const;

export const MONTHS_PER_PAYOUT: Record<PayoutFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

// Matches moneySchema's upper bound in packages/contracts.
export const MAX_AMOUNT = 999_999_999;

export type Range = { low: number; high: number };

export type Projection = {
  rateBps: Range;
  monthlyProfit: Range;
  perPayout: Range;
  totalOverTerm: Range;
  monthsPerPayout: number;
  termMonths: number;
};

export function rateRange(type: InvestmentType): Range {
  return type === 'fixed'
    ? { low: FIXED_RATE_BPS, high: FIXED_RATE_BPS }
    : { low: VARIABLE_RATE_MIN_BPS, high: VARIABLE_RATE_MAX_BPS };
}

// Whole-taka amount for one month at one rate.
export function monthlyProfit(amount: number, rateBps: number): number {
  return Math.round((amount * rateBps) / 10_000);
}

export function project(
  amount: number,
  type: InvestmentType,
  frequency: PayoutFrequency,
  termMonths: number,
): Projection {
  const rateBps = rateRange(type);
  const monthsPerPayout = MONTHS_PER_PAYOUT[frequency];
  const monthly = {
    low: monthlyProfit(amount, rateBps.low),
    high: monthlyProfit(amount, rateBps.high),
  };

  return {
    rateBps,
    monthlyProfit: monthly,
    // Summing equal months is the same as multiplying; the per-month split
    // only matters when real rates differ month to month.
    perPayout: {
      low: monthly.low * monthsPerPayout,
      high: monthly.high * monthsPerPayout,
    },
    totalOverTerm: {
      low: monthly.low * termMonths,
      high: monthly.high * termMonths,
    },
    monthsPerPayout,
    termMonths,
  };
}

// Display formatting (taka, rates, terms) is locale-aware and lives in
// lib/i18n/format.ts.
