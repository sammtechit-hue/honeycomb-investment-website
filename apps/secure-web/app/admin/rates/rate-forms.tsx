'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MONTH_NAMES } from '@investment-platform/contracts/monthlyRateSetting';
import { Alert, Field, FormActions, describedBy, inputClass, rowActionClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

// Monthly rates are what variable-rate investments earn: one rate per project
// per month. Stored as Decimal(3,2), so below 10%.
const MAX_RATE = 9.99;

const rateField = z
  .string()
  .trim()
  .min(1, 'Enter the rate')
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= MAX_RATE, `Between 0 and ${MAX_RATE}%`);

const monthLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

function currentMonth() {
  const [year, month] = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).split('-').map(Number);
  return { month: MONTH_NAMES[month - 1], year: String(year) };
}

const schema = z.object({
  projectIds: z.array(z.string()).min(1, 'Choose at least one project'),
  month: z.enum(MONTH_NAMES),
  year: z
    .string()
    .trim()
    .refine((v) => /^\d{4}$/.test(v) && Number(v) >= 2020 && Number(v) <= 2100, 'Enter a year like 2026'),
  rate: rateField,
});
type Values = z.infer<typeof schema>;

// Set one month's rate for one project (project page) or several at once
// (rates page). Months that already have a rate are skipped by the API and
// reported back.
export function SetRateForm({
  projects,
  fixedProjectId,
}: {
  projects: { id: string; name: string }[];
  fixedProjectId?: string;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { projectIds: fixedProjectId ? [fixedProjectId] : [], ...currentMonth(), rate: '' },
  });

  async function onSubmit(values: Values) {
    setSubmitError(null);
    setNotice(null);
    const common = { month: values.month, year: Number(values.year), rate: Number(values.rate) };
    const result =
      values.projectIds.length === 1
        ? await submitJson('/api/admin/monthly-rate-setting', { ...common, projectId: values.projectIds[0] })
        : await submitJson('/api/admin/monthly-rate-setting/bulk', { ...common, projectIds: values.projectIds });

    if (result.ok) {
      const message = (result.data as { message?: string } | null)?.message;
      setNotice(message ?? 'Rate saved.');
      reset({ ...values, rate: '' });
      router.refresh();
      return;
    }
    for (const field of ['month', 'year', 'rate'] as const) {
      if (result.fieldErrors[field]) setError(field, { message: result.fieldErrors[field] });
    }
    setSubmitError(result.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      {notice && (
        <p role="status" className="rounded-md border border-hairline bg-surface p-3 text-sm leading-5 text-ink">
          {notice}
        </p>
      )}

      {!fixedProjectId && (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm leading-5 text-ink">
            Projects <span aria-hidden>*</span>
          </legend>
          {projects.length === 0 ? (
            <p className="text-sm leading-5 text-muted">No projects yet.</p>
          ) : (
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-hairline p-3 sm:grid-cols-2">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm leading-5 text-ink">
                  <input type="checkbox" value={p.id} {...register('projectIds')} className="accent-black" />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          )}
          {errors.projectIds && <p className="text-xs leading-4 text-ink">{errors.projectIds.message}</p>}
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field id="month" label="Month" error={errors.month?.message}>
          <select id="month" {...register('month')} className={inputClass}>
            {MONTH_NAMES.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="year" label="Year" error={errors.year?.message}>
          <input
            id="year"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.year}
            aria-describedby={describedBy('year', errors.year?.message)}
            {...register('year')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field id="rate" label="Monthly rate (%)" error={errors.rate?.message}>
          <input
            id="rate"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 2.25"
            aria-invalid={!!errors.rate}
            aria-describedby={describedBy('rate', errors.rate?.message)}
            {...register('rate')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      <FormActions busy={isSubmitting} label="Set rate" busyLabel="Saving…" />
    </form>
  );
}

// Change an existing month's rate in place, or switch it on/off. Only the
// rate and the active flag can change; the month and project are fixed.
export function RateRowActions({ id, rate, isActive }: { id: string; rate: string; isActive: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(Number(rate)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const result = await submitJson(`/api/admin/monthly-rate-setting/${id}`, body, 'PATCH');
    setBusy(false);
    if (result.ok) {
      setEditing(false);
      router.refresh();
      return;
    }
    setError(result.message);
  }

  if (editing) {
    const parsed = rateField.safeParse(value);
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <label htmlFor={`rate-${id}`} className="sr-only">
            New rate (%)
          </label>
          <input
            id={`rate-${id}`}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${inputClass} h-9 w-24 tabular-nums`}
          />
          <button
            type="button"
            disabled={busy || !parsed.success}
            onClick={() => save({ rate: Number(value) })}
            className={rowActionClass}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className={rowActionClass}>
            Cancel
          </button>
        </div>
        {!parsed.success && <span className="text-xs leading-4 text-muted">{parsed.error.issues[0].message}</span>}
        {error && <span className="text-xs leading-4 text-ink">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-4">
        <button type="button" onClick={() => setEditing(true)} className={rowActionClass}>
          Change
        </button>
        <button type="button" disabled={busy} onClick={() => save({ isActive: !isActive })} className={rowActionClass}>
          {isActive ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      {error && <span className="text-xs leading-4 text-ink">{error}</span>}
    </div>
  );
}
