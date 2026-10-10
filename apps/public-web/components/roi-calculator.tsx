'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { localePath, toAsciiDigits, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { createFormat, fill, type Format } from '@/lib/i18n/format';
import { REGISTER_URL } from '@/lib/site';
import {
  MAX_AMOUNT,
  TERM_OPTIONS_MONTHS,
  VARIABLE_RATE_MAX_BPS,
  VARIABLE_RATE_MIN_BPS,
  FIXED_RATE_BPS,
  project,
  type InvestmentType,
  type PayoutFrequency,
} from '@/lib/roi';
import { LeadCaptureForm } from './lead-capture-form';
import { SegmentedControl } from './segmented-control';

// Project cards dispatch this to load their terms into the calculator.
export const ROI_PREFILL_EVENT = 'roi:prefill';

export type RoiPrefill = {
  amount: number;
  investmentType: InvestmentType;
  frequency: PayoutFrequency;
  termMonths: number;
};

// Only the copy this component tree renders is sent to the browser.
export type RoiCalculatorDict = Pick<Dictionary, 'calculator' | 'lead' | 'units'>;

// Once a visitor has given their details, don't ask again on this tab.
// sessionStorage can throw (private mode, blocked storage) — treat that as
// "not captured yet".
const LEAD_FLAG_KEY = 'hc.roiLeadCaptured';

function readLeadFlag(): boolean {
  try {
    return sessionStorage.getItem(LEAD_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function writeLeadFlag() {
  try {
    sessionStorage.setItem(LEAD_FLAG_KEY, '1');
  } catch {
    // Storage unavailable — the in-memory flag still unlocks this view.
  }
}

const subscribeNoop = () => () => {};

export function RoiCalculator({ locale, dict }: { locale: Locale; dict: RoiCalculatorDict }) {
  const t = dict.calculator;
  const f = useMemo(() => createFormat(locale, dict.units), [locale, dict.units]);

  const [amount, setAmount] = useState(500_000);
  const [investmentType, setInvestmentType] = useState<InvestmentType>('fixed');
  const [frequency, setFrequency] = useState<PayoutFrequency>('monthly');
  const [termMonths, setTermMonths] = useState<number>(24);

  // Server render is always "locked"; the stored flag is read only on the
  // client so hydration matches.
  const storedCapture = useSyncExternalStore(subscribeNoop, readLeadFlag, () => false);
  const [capturedNow, setCapturedNow] = useState(false);
  const unlocked = storedCapture || capturedNow;

  useEffect(() => {
    const onPrefill = (event: Event) => {
      const detail = (event as CustomEvent<RoiPrefill>).detail;
      setAmount(detail.amount);
      setInvestmentType(detail.investmentType);
      setFrequency(detail.frequency);
      setTermMonths(detail.termMonths);
    };
    window.addEventListener(ROI_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(ROI_PREFILL_EVENT, onPrefill);
  }, []);

  const amountError =
    amount <= 0
      ? t.amountRequired
      : amount > MAX_AMOUNT
        ? fill(t.amountTooLarge, { max: f.taka(MAX_AMOUNT) })
        : null;

  const termOptions = TERM_OPTIONS_MONTHS.includes(termMonths as (typeof TERM_OPTIONS_MONTHS)[number])
    ? [...TERM_OPTIONS_MONTHS]
    : [...TERM_OPTIONS_MONTHS, termMonths].sort((a, b) => a - b);

  return (
    <div
      id="calculator"
      className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{t.title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t.intro}</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="roi-amount" className="mb-2 block text-sm font-medium text-zinc-700">
            {t.amount}
          </label>
          <div className="flex items-center rounded-md border border-zinc-300 bg-white focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950">
            <span className="pl-3 text-zinc-500" aria-hidden="true">
              ৳
            </span>
            <input
              id="roi-amount"
              inputMode="numeric"
              autoComplete="off"
              value={amount > 0 ? f.number(amount) : ''}
              onChange={(event) => {
                // Accept Bengali or ASCII digits; the field shows the
                // page language's digits either way.
                const digits = toAsciiDigits(event.target.value).replace(/\D/g, '').slice(0, 12);
                setAmount(digits ? Number(digits) : 0);
              }}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? 'roi-amount-error' : undefined}
              className="w-full rounded-md bg-transparent px-2 py-2.5 text-base font-medium text-zinc-950 focus:outline-none"
            />
          </div>
          {amountError && (
            <p id="roi-amount-error" className="mt-1 text-xs font-medium text-zinc-950">
              {amountError}
            </p>
          )}
        </div>

        <SegmentedControl<InvestmentType>
          legend={t.type}
          value={investmentType}
          onChange={setInvestmentType}
          options={[
            { value: 'fixed', label: t.fixed, hint: fill(t.perMonth, { rate: f.rate(FIXED_RATE_BPS) }) },
            {
              value: 'unfixed',
              label: t.variable,
              hint: fill(t.perMonth, {
                rate: `${f.rate(VARIABLE_RATE_MIN_BPS)}–${f.rate(VARIABLE_RATE_MAX_BPS)}`,
              }),
            },
          ]}
        />

        <SegmentedControl<number>
          legend={t.term}
          value={termMonths}
          onChange={setTermMonths}
          options={termOptions.map((months) => ({ value: months, label: f.term(months) }))}
        />

        <SegmentedControl<PayoutFrequency>
          legend={t.frequency}
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'monthly', label: t.frequencyOptions.monthly },
            { value: 'quarterly', label: t.frequencyOptions.quarterly },
            { value: 'yearly', label: t.frequencyOptions.yearly },
          ]}
        />
      </div>

      <div className="mt-6 border-t border-zinc-200 pt-5" aria-live="polite">
        {unlocked ? (
          amountError ? (
            <p className="text-sm text-zinc-600">{t.invalidAmount}</p>
          ) : (
            <ProjectionResult
              locale={locale}
              t={t}
              f={f}
              amount={amount}
              investmentType={investmentType}
              frequency={frequency}
              termMonths={termMonths}
            />
          )
        ) : (
          <div>
            <h3 className="text-base font-semibold text-zinc-950">{t.lockedTitle}</h3>
            <p className="mb-4 mt-1 text-sm text-zinc-600">{t.lockedBody}</p>
            <LeadCaptureForm
              locale={locale}
              t={dict.lead}
              enteredAmount={amountError ? 0 : amount}
              onCaptured={() => {
                writeLeadFlag();
                setCapturedNow(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectionResult({
  locale,
  t,
  f,
  amount,
  investmentType,
  frequency,
  termMonths,
}: {
  locale: Locale;
  t: Dictionary['calculator'];
  f: Format;
  amount: number;
  investmentType: InvestmentType;
  frequency: PayoutFrequency;
  termMonths: number;
}) {
  const result = project(amount, investmentType, frequency, termMonths);
  const isVariable = investmentType === 'unfixed';
  const term = f.term(termMonths);
  const rate = f.range(result.rateBps, f.rate);
  const monthly = f.range(result.monthlyProfit, f.taka);
  const perPayout = f.range(result.perPayout, f.taka);
  const overTerm = f.range(result.totalOverTerm, f.taka);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-zinc-100 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t.perPayout[frequency]}
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">{perPayout}</p>
        <p className="mt-1 text-xs text-zinc-600">{t.notGuaranteed}</p>
      </div>

      <dl className="divide-y divide-zinc-200 text-sm">
        <Row label={t.rateApplied} value={fill(t.ratePerMonth, { rate })} />
        <Row label={t.profitPerMonth} value={monthly} />
        <Row label={fill(t.profitOverTerm, { term })} value={overTerm} />
        <Row label={t.originalAmount} value={f.taka(amount)} />
      </dl>

      <details className="group rounded-lg border border-zinc-200 text-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-zinc-950 marker:hidden">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          {t.fullCalculation}
        </summary>
        <ol className="space-y-2 border-t border-zinc-200 px-4 py-3 text-zinc-700">
          <li>
            <span className="font-medium text-zinc-950">{t.eachMonth}</span> {f.taka(amount)} × {rate}{' '}
            = {monthly}
          </li>
          {result.monthsPerPayout > 1 && (
            <li>
              <span className="font-medium text-zinc-950">{t.eachPayout[frequency]}</span>{' '}
              {fill(t.payoutSum, { count: f.plain(result.monthsPerPayout), total: perPayout })}
            </li>
          )}
          <li>
            <span className="font-medium text-zinc-950">{fill(t.overTerm, { term })}</span>{' '}
            {fill(t.termSum, { count: f.plain(termMonths), total: overTerm })}
          </li>
          <li>{fill(t.noCompounding, { amount: f.taka(amount) })}</li>
        </ol>
      </details>

      {isVariable && (
        <p className="text-xs text-zinc-600">
          {fill(t.variableNote, {
            minRate: f.rate(VARIABLE_RATE_MIN_BPS),
            maxRate: f.rate(VARIABLE_RATE_MAX_BPS),
          })}
        </p>
      )}

      <p className="text-xs text-zinc-500">
        {t.disclaimer}{' '}
        <a href="#methodology" className="underline underline-offset-2 hover:text-zinc-950">
          {t.methodologyLink}
        </a>{' '}
        ·{' '}
        <Link
          href={localePath(locale, '/legal')}
          className="underline underline-offset-2 hover:text-zinc-950"
        >
          {t.legalLink}
        </Link>
      </p>

      <a
        href={REGISTER_URL}
        className="rounded-md bg-zinc-950 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-800"
      >
        {t.cta}
      </a>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="text-right font-medium text-zinc-950 tabular-nums">{value}</dd>
    </div>
  );
}
