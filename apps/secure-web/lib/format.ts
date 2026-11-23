// Display formatting for money, rates and dates. The API sends Decimal
// columns as strings ("500000.00"), so every helper accepts string | number.

type Numeric = string | number | null | undefined;

// en-IN groups in lakhs/crores (5,00,000), which is how amounts are written
// in Bangladesh.
const takaFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatTaka(value: Numeric): string {
  return `৳ ${takaFormat.format(Number(value ?? 0))}`;
}

// Sums money in whole paisa so floating point never drifts the total.
export function sumTaka(values: Numeric[]): number {
  const paisa = values.reduce<number>((sum, v) => sum + Math.round(Number(v ?? 0) * 100), 0);
  return paisa / 100;
}

export function formatRate(value: Numeric): string {
  return `${Number(value ?? 0).toFixed(2).replace(/\.?0+$/, '')}%`;
}

const TZ = 'Asia/Dhaka';
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
const yearFormat = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: TZ });

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormat.format(new Date(iso)) : '—';
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });

// "5:02 pm" (Bangladesh time).
export function formatTime(iso: string | null | undefined): string {
  return iso ? timeFormat.format(new Date(iso)) : '—';
}

// "11 Aug – 10 Sep 2026"
export function formatCycle(startIso: string, endIso: string): string {
  return `${dayMonthFormat.format(new Date(startIso))} – ${dateFormat.format(new Date(endIso))}`;
}

export function yearOf(iso: string): number {
  return Number(yearFormat.format(new Date(iso)));
}

// Whole days from today (Dhaka) to a date-only value; negative once past.
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: TZ }));
  const target = new Date(iso.slice(0, 10));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
