'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Field, FormActions, inputClass, primaryButtonClass, rowActionClass, secondaryButtonClass } from '@/components/dashboard/form';
import { EXPORT_FORMAT } from '@/components/admin/labels';
import { formatTaka, sumTaka } from '@/lib/format';
import type { ExportFormat } from '@/lib/payouts';
import { submitJson } from '@/lib/submit';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function dhakaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

// ---------------------------------------------------------------------------
// New batch in a window
// ---------------------------------------------------------------------------

export function CreateBatchForm({ windowId }: { windowId: string }) {
  const router = useRouter();
  const [exportType, setExportType] = useState<ExportFormat>('cbl');
  const [batchDate, setBatchDate] = useState(dhakaToday());
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!isoDate.test(batchDate)) {
      setDateError('Choose the day the bank pays');
      return;
    }
    setDateError(null);
    setBusy(true);
    const result = await submitJson(`/api/admin/disbursement-batch/${windowId}`, { exportType, batchDate });
    if (result.ok) {
      const id = (result.data as { data?: { id?: string } } | null)?.data?.id;
      if (id) {
        router.push(`/admin/payouts/batches/${id}`);
        return;
      }
      setBusy(false);
      router.refresh();
      return;
    }
    setBusy(false);
    if (result.fieldErrors.batchDate) setDateError(result.fieldErrors.batchDate);
    setSubmitError(result.message);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm leading-5 text-ink">
          Bank file <span aria-hidden>*</span>
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(EXPORT_FORMAT) as ExportFormat[]).map((f) => (
            <label
              key={f}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm leading-5 ${
                exportType === f ? 'border-black' : 'border-hairline'
              }`}
            >
              <input
                type="radio"
                name="exportType"
                value={f}
                checked={exportType === f}
                onChange={() => setExportType(f)}
                className="mt-1 accent-black"
              />
              <span className="flex flex-col">
                <span className="font-semibold text-ink">{EXPORT_FORMAT[f].label}</span>
                <span className="text-muted">{EXPORT_FORMAT[f].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="batchDate" label="Bank payment date" error={dateError ?? undefined}>
        <input
          id="batchDate"
          type="date"
          value={batchDate}
          onChange={(e) => setBatchDate(e.target.value)}
          aria-invalid={!!dateError}
          aria-describedby={dateError ? 'batchDate-error' : undefined}
          className={`${inputClass} sm:max-w-[220px]`}
        />
      </Field>
      <FormActions busy={busy} label="Create batch" busyLabel="Creating…" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Add items to a draft batch
// ---------------------------------------------------------------------------

export type PickableItem = {
  id: string;
  investorName: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  reason: string;
  amount: string;
};

export function AddItemsForm({ batchId, items }: { batchId: string; items: PickableItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => sumTaka(items.filter((i) => selected.has(i.id)).map((i) => i.amount)),
    [items, selected],
  );
  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function add() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    const result = await submitJson(
      '/api/admin/disbursement-batch/items',
      { batchId, itemIds: [...selected] },
      'PATCH',
    );
    setBusy(false);
    if (result.ok) {
      setSelected(new Set());
      router.refresh();
      return;
    }
    setError(result.message);
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm leading-5" style={{ minWidth: 760 }}>
          <thead className="border-b border-hairline bg-surface text-xs leading-4 tracking-[0.6px] text-muted uppercase">
            <tr>
              <th className="w-10 px-5 py-3 font-normal">
                <input
                  type="checkbox"
                  aria-label="Select every item"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
                  className="accent-black"
                />
              </th>
              <th className="px-5 py-3 font-normal">Investor</th>
              <th className="px-5 py-3 font-normal">Pays into</th>
              <th className="px-5 py-3 font-normal">For</th>
              <th className="px-5 py-3 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {items.map((i) => (
              <tr key={i.id} className={selected.has(i.id) ? 'bg-surface' : undefined}>
                <td className="px-5 py-3.5 align-top">
                  <input
                    type="checkbox"
                    aria-label={`Select ${i.investorName}`}
                    checked={selected.has(i.id)}
                    onChange={() => toggle(i.id)}
                    className="accent-black"
                  />
                </td>
                <td className="px-5 py-3.5 align-top font-semibold text-ink">{i.investorName}</td>
                <td className="px-5 py-3.5 align-top text-ink">
                  {i.accountName}
                  <span className="block text-xs leading-4 text-muted">
                    {i.bankName} · {i.accountNumber}
                  </span>
                </td>
                <td className="px-5 py-3.5 align-top text-ink">{i.reason}</td>
                <td className="px-5 py-3.5 text-right align-top whitespace-nowrap text-ink tabular-nums">
                  {formatTaka(i.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-5 text-ink tabular-nums">
          {selected.size} selected · {formatTaka(total)}
        </p>
        <button type="button" onClick={add} disabled={busy || selected.size === 0} className={primaryButtonClass}>
          {busy ? 'Adding…' : 'Add to batch'}
        </button>
      </div>
      {error && (
        <div className="px-5 pb-4">
          <Alert>
            <p>{error}</p>
          </Alert>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-item actions: notes, and taking an item out of a draft batch
// ---------------------------------------------------------------------------

// PATCH /admin/disbursement-item/:id needs both notes every time (null
// clears one), so each request resends the current values of the other.
export function ItemActions({
  id,
  remarks,
  investorNote,
  canRemove,
}: {
  id: string;
  remarks: string | null;
  investorNote: string | null;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [internal, setInternal] = useState(remarks ?? '');
  const [forInvestor, setForInvestor] = useState(investorNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const result = await submitJson(`/api/admin/disbursement-item/${id}`, body, 'PATCH');
    setBusy(false);
    if (result.ok) {
      setEditing(false);
      setConfirmRemove(false);
      router.refresh();
      return;
    }
    setError(result.message);
  }

  const tooLong = internal.trim().length > 255 || forInvestor.trim().length > 255;

  if (editing) {
    return (
      <div className="flex w-72 flex-col gap-2">
        <label htmlFor={`remarks-${id}`} className="text-xs leading-4 text-muted">
          Staff note (internal)
        </label>
        <textarea
          id={`remarks-${id}`}
          value={internal}
          onChange={(e) => setInternal(e.target.value)}
          rows={2}
          maxLength={255}
          className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-black"
        />
        <label htmlFor={`note-${id}`} className="text-xs leading-4 text-muted">
          Note for the investor
        </label>
        <textarea
          id={`note-${id}`}
          value={forInvestor}
          onChange={(e) => setForInvestor(e.target.value)}
          rows={2}
          maxLength={255}
          className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-black"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || tooLong}
            onClick={() => send({ remarks: internal.trim() || null, investorNote: forInvestor.trim() || null })}
            className={rowActionClass}
          >
            {busy ? 'Saving…' : 'Save notes'}
          </button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className={rowActionClass}>
            Cancel
          </button>
        </div>
        {error && <span className="text-xs leading-4 text-ink">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {confirmRemove ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirmRemove(false)} className={secondaryButtonClass}>
            Keep
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => send({ remarks, investorNote, batchId: null })}
            className={primaryButtonClass}
          >
            {busy ? 'Removing…' : 'Yes, remove'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={() => setEditing(true)} className={rowActionClass}>
            Notes
          </button>
          {canRemove && (
            <button type="button" onClick={() => setConfirmRemove(true)} className={rowActionClass}>
              Remove
            </button>
          )}
        </div>
      )}
      {error && <span className="text-xs leading-4 text-ink">{error}</span>}
    </div>
  );
}
