'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Field, describedBy, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

// Approve applies every staged change at once; reject needs a reason
// (5–150 characters, the API's rule) that the investor will see.
export function ReviewForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(body: { status: 'APPROVED' } | { status: 'REJECTED'; rejectionReason: string }) {
    setPending(true);
    setSubmitError(null);
    const result = await submitJson(`/api/admin/investor/edit-requests/${requestId}`, body, 'PATCH');
    setPending(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setSubmitError(result.message);
  }

  function reject() {
    const trimmed = reason.trim();
    const error =
      trimmed.length < 5
        ? 'Give a reason of at least 5 characters'
        : trimmed.length > 150
          ? 'Keep the reason under 150 characters'
          : null;
    setReasonError(error);
    if (!error) send({ status: 'REJECTED', rejectionReason: trimmed });
  }

  return (
    <div className="flex flex-col gap-4">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}

      {mode === 'reject' ? (
        <div className="flex flex-col gap-4">
          <Field id="rejectionReason" label="Reason" hint="The investor sees this." error={reasonError ?? undefined}>
            <input
              id="rejectionReason"
              value={reason}
              maxLength={150}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!reasonError}
              aria-describedby={describedBy('rejectionReason', reasonError ?? undefined, 'hint')}
              className={inputClass}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setMode('idle')} disabled={pending} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="button" onClick={reject} disabled={pending} className={primaryButtonClass}>
              {pending ? 'Rejecting…' : 'Reject request'}
            </button>
          </div>
        </div>
      ) : mode === 'approve' ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm leading-5 text-ink">Apply these changes to the investor’s profile?</span>
          <button type="button" onClick={() => setMode('idle')} disabled={pending} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={() => send({ status: 'APPROVED' })} disabled={pending} className={primaryButtonClass}>
            {pending ? 'Approving…' : 'Yes, approve'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setMode('approve')} className={primaryButtonClass}>
            Approve changes
          </button>
          <button type="button" onClick={() => setMode('reject')} className={secondaryButtonClass}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
