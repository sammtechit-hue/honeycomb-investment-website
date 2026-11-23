'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClass, rowActionClass } from '@/components/dashboard/form';
import { formatRate, formatTaka } from '@/lib/format';
import { submitJson } from '@/lib/submit';

const twoDecimals = /^\d+(\.\d{1,2})?$/;

function percentError(v: string, wasSet: boolean) {
  if (v === '') return wasSet ? 'The rate can’t be removed' : 'Enter the bonus rate';
  if (!twoDecimals.test(v) || Number(v) > 100) return 'Between 0 and 100%, up to 2 decimals';
  return null;
}

function amountError(v: string, wasSet: boolean) {
  if (v === '') return wasSet ? 'A recorded bonus can’t be removed, only changed' : null;
  if (!twoDecimals.test(v) || Number(v) <= 0 || Number(v) > 999_999_999.99) {
    return 'An amount above 0, up to 2 decimals';
  }
  return null;
}

// "1% of ৳60,000" in whole paisa, so the suggestion never drifts.
function percentOf(percent: string, base: string) {
  const paisa = Math.round((Number(base) * 100 * Number(percent)) / 100);
  return (paisa / 100).toFixed(2);
}

const str = (v: string | null) => (v == null ? '' : String(Number(v)));

// Record or change a referral's bonus. The API keeps a rate (1% unless
// changed) and an amount, which stays empty until staff record it. Neither
// can be cleared once set, so the form refuses a blank instead of sending it.
export function BonusEditor({
  id,
  bonusPercent,
  bonusAmount,
  invested,
}: {
  id: string;
  bonusPercent: string | null;
  bonusAmount: string | null;
  // The referred investor's activated investments to date, for reference.
  invested: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(str(bonusPercent));
  const [amount, setAmount] = useState(str(bonusAmount));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pErr = percentError(percent, bonusPercent != null);
  const aErr = amountError(amount, bonusAmount != null);
  const suggestion =
    invested && Number(invested) > 0 && !pErr ? percentOf(percent, invested) : null;

  async function save() {
    if (pErr || aErr) return;
    const body: Record<string, number> = {};
    if (percent !== str(bonusPercent)) body.bonusPercent = Number(percent);
    if (amount !== '' && amount !== str(bonusAmount)) body.bonusAmount = Number(amount);
    if (Object.keys(body).length === 0) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await submitJson(`/api/admin/referral/${id}`, body, 'PATCH');
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(result.message);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={rowActionClass}>
        {bonusAmount == null ? 'Record bonus' : 'Change'}
      </button>
    );
  }

  return (
    <div className="flex w-64 flex-col gap-2 text-left">
      <label htmlFor={`pct-${id}`} className="text-xs leading-4 text-muted">
        Bonus rate (%)
      </label>
      <input
        id={`pct-${id}`}
        inputMode="decimal"
        value={percent}
        onChange={(e) => setPercent(e.target.value.trim())}
        aria-invalid={!!pErr}
        className={`${inputClass} h-9 tabular-nums`}
      />
      {pErr && <span className="text-xs leading-4 text-ink">{pErr}</span>}

      <label htmlFor={`amt-${id}`} className="text-xs leading-4 text-muted">
        Bonus amount (৳)
      </label>
      <input
        id={`amt-${id}`}
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.trim())}
        aria-invalid={!!aErr}
        className={`${inputClass} h-9 tabular-nums`}
      />
      {aErr && <span className="text-xs leading-4 text-ink">{aErr}</span>}
      {suggestion && (
        <p className="text-xs leading-4 text-muted">
          For reference: {formatRate(percent)} of {formatTaka(invested)} invested is {formatTaka(suggestion)}.{' '}
          <button type="button" onClick={() => setAmount(String(Number(suggestion)))} className="underline">
            Use it
          </button>
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" disabled={busy || !!pErr || !!aErr} onClick={save} className={rowActionClass}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setPercent(str(bonusPercent));
            setAmount(str(bonusAmount));
            setError(null);
          }}
          className={rowActionClass}
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs leading-4 text-ink">{error}</span>}
    </div>
  );
}

function dhakaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

// Change when an unused code stops working. Expiry is stored as Bangladesh
// clock time, so "valid through 30 Dec" is sent as 30 Dec 23:59:59 in that
// same zoneless form.
export function ExpiryEditor({ id, expiresAt }: { id: string; expiresAt: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(expiresAt.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = dhakaToday();
  const invalid = !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ? 'Choose a date'
    : date < today
      ? 'Today or later'
      : null;

  async function save() {
    if (invalid) return;
    setBusy(true);
    setError(null);
    const result = await submitJson(
      `/api/admin/referral-code/${id}`,
      { expiresAt: `${date}T23:59:59.000Z` },
      'PATCH',
    );
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(result.message);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={rowActionClass}>
        Change expiry
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={`exp-${id}`} className="sr-only">
          Valid through
        </label>
        <input
          id={`exp-${id}`}
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!invalid}
          className={`${inputClass} h-9 w-40`}
        />
        <button type="button" disabled={busy || !!invalid} onClick={save} className={rowActionClass}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={rowActionClass}>
          Cancel
        </button>
      </div>
      {invalid && <span className="text-xs leading-4 text-muted">{invalid}</span>}
      {error && <span className="text-xs leading-4 text-ink">{error}</span>}
    </div>
  );
}
