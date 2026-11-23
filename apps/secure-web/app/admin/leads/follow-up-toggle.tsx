'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rowActionClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

// Mark a lead as followed up, or undo it. Both directions are one click: the
// flag is a reminder for the team, not a record that can't be changed.
export function FollowUpToggle({ id, followedUp, name }: { id: string; followedUp: boolean; name: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Covers the refresh after a save, so the button stays disabled until the
  // updated row arrives and a second click can't resend the old value.
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = saving || refreshing;

  async function toggle() {
    setSaving(true);
    setError(null);
    const result = await submitJson(`/api/admin/roi-calculator-lead/${id}`, { followedUp: !followedUp }, 'PATCH');
    setSaving(false);
    if (result.ok) {
      startRefresh(() => router.refresh());
      return;
    }
    setError(result.message);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={followedUp ? `Mark ${name} as not followed up` : `Mark ${name} as followed up`}
        className={`${rowActionClass} disabled:opacity-60`}
      >
        {busy ? 'Saving…' : followedUp ? 'Undo' : 'Mark followed up'}
      </button>
      {error && (
        <span role="alert" className="max-w-56 text-right text-xs leading-4 text-ink">
          {error}
        </span>
      )}
    </div>
  );
}
