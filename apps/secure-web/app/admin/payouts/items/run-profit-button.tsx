'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, primaryButtonClass, secondaryButtonClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

type RunResult = { created: number; skipped: number };

// POST /admin/monthly-profit-ledger. The page only enables this on the cycle
// day; the API refuses on any other day anyway. Running twice is safe: a
// cycle already recorded for an investment is skipped, not doubled.
export function RunProfitButton({ cycleLabel, eligible }: { cycleLabel: string; eligible: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await submitJson('/api/admin/monthly-profit-ledger', {}, 'POST');
    setBusy(false);
    setConfirming(false);
    if (res.ok) {
      const data = (res.data as { data?: Partial<RunResult> } | null)?.data;
      setResult({ created: data?.created ?? 0, skipped: data?.skipped ?? 0 });
      router.refresh();
      return;
    }
    setError(res.message);
  }

  return (
    <div className="flex flex-col gap-4">
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm leading-5 text-ink">
            Calculate profit for {cycleLabel}? {eligible} {eligible === 1 ? 'investment gets' : 'investments get'} a
            profit row. Running it again later today is safe; nothing is counted twice.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={run} disabled={busy} className={primaryButtonClass}>
              {busy ? 'Calculating…' : 'Yes, calculate profit'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="self-start">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError(null);
              setConfirming(true);
            }}
            className={primaryButtonClass}
          >
            Run monthly profit
          </button>
        </div>
      )}
      {error && (
        <Alert>
          <p>{error}</p>
        </Alert>
      )}
      {result && (
        <div role="status" className="rounded-md border border-hairline bg-surface p-4 text-sm leading-5 text-ink">
          <p className="font-semibold">
            {result.created} profit {result.created === 1 ? 'row' : 'rows'} created
            {result.skipped > 0 && `, ${result.skipped} ${result.skipped === 1 ? 'investment' : 'investments'} left out`}.
          </p>
          {result.created < eligible && (
            <p className="mt-1 text-secondary">
              Fewer than expected: investments already calculated for this cycle aren’t counted again.
            </p>
          )}
          <p className="mt-1 text-secondary">Next, prepare payout items below.</p>
        </div>
      )}
    </div>
  );
}
