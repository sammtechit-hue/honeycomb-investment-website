'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Field, FormActions, describedBy, inputClass } from '@/components/dashboard/form';
import type { AdminBusinessSettings } from '@/lib/admin';
import { submitJson } from '@/lib/submit';

// The profit settings row the monthly run reads. Creating allows a counting
// delay of 0 days, but updating only accepts 1–28 (the API reuses the
// cycle-day rule), so the form asks for 1–28 either way.
const MAX_RATE = 9.99;

const wholeIn = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, message);

const schema = z.object({
  setcycleday: wholeIn(1, 28, 'A day between 1 and 28'),
  countingStartAfterDays: wholeIn(1, 28, 'Between 1 and 28 days'),
  rate: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= MAX_RATE),
      `Between 0 and ${MAX_RATE}%`,
    ),
  label: z.string().trim().max(200, 'Up to 200 characters'),
});
type Values = z.infer<typeof schema>;

const str = (v: number | string | null | undefined) => (v == null ? '' : String(Number(v)));

export function SettingsForm({ settings }: { settings: AdminBusinessSettings | null }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const initial: Values = {
    setcycleday: str(settings?.setcycleday) || '11',
    countingStartAfterDays: str(settings?.countingStartAfterDays) || '10',
    rate: str(settings?.rate),
    label: settings?.label ?? '',
  };
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

  async function onSubmit(values: Values) {
    setSubmitError(null);
    setSaved(false);
    const all = {
      setcycleday: Number(values.setcycleday),
      countingStartAfterDays: Number(values.countingStartAfterDays),
      rate: values.rate === '' ? undefined : Number(values.rate),
      label: values.label || undefined,
    };

    if (settings && values.rate === '' && initial.rate !== '') {
      setError('rate', { message: 'This can’t be removed yet. Enter a rate instead.' });
      return;
    }

    let body: Record<string, unknown> = all;
    if (settings) {
      body = {};
      for (const key of Object.keys(all) as (keyof Values)[]) {
        if (values[key] !== initial[key]) body[key] = all[key];
      }
      if (Object.keys(body).length === 0) return;
    }

    const result = settings
      ? await submitJson(`/api/admin/business-settings/${settings.id}`, body, 'PATCH')
      : await submitJson('/api/admin/business-settings', body);
    if (result.ok) {
      setSaved(true);
      reset(values);
      router.refresh();
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field in values) setError(field as keyof Values, { message });
    }
    setSubmitError(result.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      {saved && (
        <p role="status" className="rounded-md border border-hairline bg-surface p-3 text-sm leading-5 text-ink">
          Settings saved.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          id="setcycleday"
          label="Profit run day"
          hint="Day of the month (Bangladesh time) the monthly profit is calculated."
          error={errors.setcycleday?.message}
        >
          <input
            id="setcycleday"
            inputMode="numeric"
            aria-invalid={!!errors.setcycleday}
            aria-describedby={describedBy('setcycleday', errors.setcycleday?.message, 'hint')}
            {...register('setcycleday')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field
          id="countingStartAfterDays"
          label="Profit starts after (days)"
          hint="Days after the investment date before profit starts counting."
          error={errors.countingStartAfterDays?.message}
        >
          <input
            id="countingStartAfterDays"
            inputMode="numeric"
            aria-invalid={!!errors.countingStartAfterDays}
            aria-describedby={describedBy('countingStartAfterDays', errors.countingStartAfterDays?.message, 'hint')}
            {...register('countingStartAfterDays')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      <Field
        id="rate"
        label="Default fixed rate (%)"
        optional
        hint="Used when staff create a fixed-rate investment in a project with no fixed rate of its own."
        error={errors.rate?.message}
      >
        <input
          id="rate"
          inputMode="decimal"
          aria-invalid={!!errors.rate}
          aria-describedby={describedBy('rate', errors.rate?.message, 'hint')}
          {...register('rate')}
          className={`${inputClass} tabular-nums sm:max-w-[200px]`}
        />
      </Field>

      <Field id="label" label="Note" optional hint="For staff, e.g. why these values changed." error={errors.label?.message}>
        <input
          id="label"
          autoComplete="off"
          aria-invalid={!!errors.label}
          aria-describedby={describedBy('label', errors.label?.message, 'hint')}
          {...register('label')}
          className={inputClass}
        />
      </Field>

      <FormActions busy={isSubmitting} label={settings ? 'Save settings' : 'Create settings'} busyLabel="Saving…" />
    </form>
  );
}
