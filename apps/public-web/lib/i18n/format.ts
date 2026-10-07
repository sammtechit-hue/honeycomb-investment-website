import type { Range } from '../roi';
import { INTL_TAG, type Locale } from './config';
import type { Dictionary } from './dictionaries/en';

// Locale-aware number and text formatting. Works in Server and Client
// Components alike: Client Components receive the locale and dict.units as
// props and build their own formatter.

export type Format = ReturnType<typeof createFormat>;

// Replaces {name} placeholders in a dictionary string.
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function createFormat(locale: Locale, units: Dictionary['units']) {
  const tag = INTL_TAG[locale];
  const whole = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const oneDecimal = new Intl.NumberFormat(tag, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const plain = new Intl.NumberFormat(tag, { useGrouping: false });
  const twoDigit = new Intl.NumberFormat(tag, { minimumIntegerDigits: 2, useGrouping: false });
  const monthName = new Intl.DateTimeFormat(tag, { month: 'long', timeZone: 'UTC' });

  const format = {
    // 5,00,000 / ৫,০০,০০০
    number: (value: number) => whole.format(value),
    // Years and counts that must not be grouped: 2026 / ২০২৬
    plain: (value: number) => plain.format(value),
    // Step numbers: 01 / ০১
    twoDigit: (value: number) => twoDigit.format(value),
    taka: (value: number) => `৳${whole.format(value)}`,
    rate: (bps: number) => `${oneDecimal.format(bps / 100)}%`,
    term: (months: number) => {
      if (months % 12 === 0) {
        const years = months / 12;
        return fill(years === 1 ? units.year : units.years, { n: plain.format(years) });
      }
      return fill(units.months, { n: plain.format(months) });
    },
    // month is 0-based, as in Date.
    month: (month: number) => monthName.format(new Date(Date.UTC(2026, month, 15))),
    range: (range: Range, formatOne: (n: number) => string) =>
      range.low === range.high
        ? formatOne(range.low)
        : `${formatOne(range.low)} – ${formatOne(range.high)}`,
  };

  return format;
}
