'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, primaryButtonClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

type RunResult = {
  created: { investmentId: string; itemId: string }[];
  skipped: { investmentId: string; reason: string }[];
};

// POST /admin/disbursement-item: makes one payout item for every active
// investment whose profit is due (enough unpaid months for its payout
// period), copying the investor's bank details. Safe to run again: profit
// already in an item is never picked twice.
export function PrepareItemsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await submitJson('/api/admin/disbursement-item', {});
    setBusy(false);
    if (res.ok) {
      const data = (res.data as { data?: RunResult } | null)?.data;
      setResult({ created: data?.created ?? [], skipped: data?.skipped ?? [] });
      router.refresh();
      return;
    }
    setError(res.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start">
        <button type="button" onClick={run} disabled={busy} className={primaryButtonClass}>
          {busy ? 'Preparing…' : 'Prepare payout items'}
        </button>
      </div>
      {error && (
        <Alert>
          <p>{error}</p>
        </Alert>
      )}
      {result && (
        <div role="status" className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4 text-sm leading-5 text-ink">
          <p className="font-semibold">
            {result.created.length} {result.created.length === 1 ? 'item' : 'items'} prepared
            {result.skipped.length > 0 && `, ${result.skipped.length} not due`}.
          </p>
          {result.skipped.length > 0 && (
            <details>
              <summary className="cursor-pointer text-secondary">Why investments were left out</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {result.skipped.map((s) => (
                  <li key={s.investmentId} className="text-secondary">
                    <Link
                      href={`/admin/investments/${s.investmentId}`}
                      className="underline decoration-rule underline-offset-2 hover:decoration-black"
                    >
                      Investment {s.investmentId.slice(0, 8)}
                    </Link>
                    : {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
