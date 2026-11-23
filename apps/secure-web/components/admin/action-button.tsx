'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, primaryButtonClass, secondaryButtonClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

// One admin action (approve, confirm, close…): sends the request, shows the
// API's error inline, and re-renders the page from the server on success so
// every badge and count updates. `confirm` adds a second click for actions
// that can't be undone.
export function ActionButton({
  endpoint,
  body,
  label,
  pendingLabel = 'Saving…',
  confirm,
  variant = 'primary',
  method = 'PATCH',
  redirectTo,
}: {
  endpoint: string;
  body: unknown;
  label: string;
  pendingLabel?: string;
  confirm?: string;
  variant?: 'primary' | 'secondary';
  method?: 'PATCH' | 'POST' | 'DELETE';
  // Where to go on success when the current page no longer applies (a delete).
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    const result = await submitJson(endpoint, body, method);
    setPending(false);
    setConfirming(false);
    if (result.ok) {
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
      return;
    }
    setError(result.message);
  }

  const buttonClass = variant === 'primary' ? primaryButtonClass : secondaryButtonClass;

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm leading-5 text-ink">{confirm}</span>
          <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={run} disabled={pending} className={primaryButtonClass}>
            {pending ? pendingLabel : `Yes, ${label.toLowerCase()}`}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (confirm ? setConfirming(true) : run())}
          disabled={pending}
          className={buttonClass}
        >
          {pending ? pendingLabel : label}
        </button>
      )}
      {error && (
        <Alert>
          <p>{error}</p>
        </Alert>
      )}
    </div>
  );
}
