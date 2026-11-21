'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { payoutMonthLabelSchema } from '@investment-platform/contracts/payoutWindow';
import { Alert, Field, FormActions, describedBy, inputClass } from '@/components/dashboard/form';
import type { PayoutWindow } from '@/lib/payouts';
import { submitJson } from '@/lib/submit';

const MONTHS = payoutMonthLabelSchema.options;
type Month = (typeof MONTHS)[number];

const monthTitle = (m: string) => `${m.charAt(0)}${m.slice(1).toLowerCase()}`;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

// The API checks create and edit differently: creating allows a one-day
// window (end on the start date), editing the dates needs the end after the
// start. The form applies the same rule so the API never has to refuse it.
function schemaFor(mode: 'create' | 'edit') {
  return z
    .object({
      month: z.enum(MONTHS),
      year: z
        .string()
        .trim()
        .refine((v) => /^\d{4}$/.test(v) && Number(v) >= 2020 && Number(v) <= 2100, 'Enter a year like 2026'),
      startDate: z.string().regex(isoDate, 'Choose the first payout day'),
      endDate: z.string().regex(isoDate, 'Choose the last payout day'),
    })
    .superRefine((v, ctx) => {
      if (!isoDate.test(v.startDate) || !isoDate.test(v.endDate)) return;
      const bad = mode === 'create' ? v.endDate < v.startDate : v.endDate <= v.startDate;
      if (bad) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: mode === 'create' ? 'On or after the first day' : 'After the first day',
        });
      }
    });
}
type Values = z.infer<ReturnType<typeof schemaFor>>;

function dhakaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function initialValues(w?: PayoutWindow): Values {
  if (w) {
    return {
      month: w.monthLabel as Month,
      year: String(w.yearLabel),
      startDate: w.startDate.slice(0, 10),
      endDate: w.endDate.slice(0, 10),
    };
  }
  const [year, month] = dhakaToday().split('-').map(Number);
  return { month: MONTHS[month - 1], year: String(year), startDate: '', endDate: '' };
}

const periodOf = (v: Pick<Values, 'month' | 'year'>) =>
  `${v.year}-${String(MONTHS.indexOf(v.month) + 1).padStart(2, '0')}`;

// Create a payout window, or change an open one's month or dates.
// `takenMonths` ("2026-11") are months that already have a window; the API
// allows more than one per month, so the form warns rather than refuses.
export function WindowForm({ existing, takenMonths }: { existing?: PayoutWindow; takenMonths: string[] }) {
  const router = useRouter();
  const mode = existing ? 'edit' : 'create';
  const initial = initialValues(existing);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schemaFor(mode)), defaultValues: initial });

  const [watchedMonth, watchedYear] = useWatch({ control, name: ['month', 'year'] });
  const period = periodOf({ month: watchedMonth, year: watchedYear });
  const periodTaken = /^\d{4}-\d{2}$/.test(period) && takenMonths.includes(period);

  async function onSubmit(values: Values) {
    setSubmitError(null);
    setSaved(false);
    const periodFields = {
      periodMonth: `${periodOf(values)}-01`,
      monthLabel: values.month,
      yearLabel: Number(values.year),
    };

    let body: Record<string, unknown>;
    if (mode === 'create') {
      body = { ...periodFields, startDate: values.startDate, endDate: values.endDate };
    } else {
      body = {};
      if (values.month !== initial.month || values.year !== initial.year) Object.assign(body, periodFields);
      if (values.startDate !== initial.startDate) body.startDate = values.startDate;
      if (values.endDate !== initial.endDate) body.endDate = values.endDate;
      if (Object.keys(body).length === 0) return;
    }

    const result = existing
      ? await submitJson(`/api/admin/payout-window/${existing.id}`, body, 'PATCH')
      : await submitJson('/api/admin/payout-window', body);

    if (result.ok) {
      if (!existing) {
        const id = (result.data as { data?: { id?: string } } | null)?.data?.id;
        router.push(id ? `/admin/payouts/windows/${id}` : '/admin/payouts');
        router.refresh();
        return;
      }
      setSaved(true);
      reset(values);
      router.refresh();
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field === 'startDate' || field === 'endDate') setError(field, { message });
      if (field === 'periodMonth' || field === 'monthLabel') setError('month', { message });
      if (field === 'yearLabel') setError('year', { message });
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
      {saved && (
        <p role="status" className="rounded-md border border-hairline bg-surface p-3 text-sm leading-5 text-ink">
          Window saved.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="month" label="Pays profit for" error={errors.month?.message}>
          <select id="month" {...register('month')} className={inputClass}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {monthTitle(m)}
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
      </div>
      {periodTaken && (
        <p role="status" className="rounded-md border border-hairline bg-surface p-3 text-sm leading-5 text-ink">
          {monthTitle(watchedMonth)} {watchedYear} already has a payout window. Check you aren’t creating it twice.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="startDate" label="First payout day" error={errors.startDate?.message}>
          <input
            id="startDate"
            type="date"
            aria-invalid={!!errors.startDate}
            aria-describedby={describedBy('startDate', errors.startDate?.message)}
            {...register('startDate')}
            className={inputClass}
          />
        </Field>
        <Field id="endDate" label="Last payout day" error={errors.endDate?.message}>
          <input
            id="endDate"
            type="date"
            aria-invalid={!!errors.endDate}
            aria-describedby={describedBy('endDate', errors.endDate?.message)}
            {...register('endDate')}
            className={inputClass}
          />
        </Field>
      </div>

      <FormActions
        busy={isSubmitting}
        label={existing ? 'Save window' : 'Create window'}
        busyLabel="Saving…"
      />
    </form>
  );
}
