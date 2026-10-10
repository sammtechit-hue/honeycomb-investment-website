'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { roiCalculatorLeadCreateSchema } from '@investment-platform/contracts/roi-calculator-lead';
import { submitRoiLead } from '@/app/actions';
import { toAsciiDigits, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';

// The amount comes from the calculator, not from this form.
const leadFormSchema = roiCalculatorLeadCreateSchema.omit({ enteredAmount: true });
type LeadFormValues = z.infer<typeof leadFormSchema>;

type Props = {
  locale: Locale;
  t: Dictionary['lead'];
  enteredAmount: number;
  onCaptured: () => void;
};

const inputClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 aria-[invalid=true]:border-zinc-950 aria-[invalid=true]:border-2';

// Field errors are shown from the dictionary, one message per field: the
// shared zod schema's messages are English-only.
export function LeadCaptureForm({ locale, t, enteredAmount, onCaptured }: Props) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
  });

  const onSubmit = (values: LeadFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await submitRoiLead({ ...values, enteredAmount }, locale);

      if (result.success) {
        onCaptured();
        return;
      }

      setFormError(result.message);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0] && field in leadFormSchema.shape) {
          setError(field as keyof LeadFormValues, { message: messages[0] });
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <div>
        <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-zinc-700">
          {t.name} <span aria-hidden="true">*</span>
        </label>
        <input
          id="lead-name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'lead-name-error' : undefined}
          className={inputClass}
          {...register('name')}
        />
        {errors.name && (
          <p id="lead-name-error" className="mt-1 text-xs font-medium text-zinc-950">
            {t.errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium text-zinc-700">
          {t.phone} <span aria-hidden="true">*</span>
        </label>
        <input
          id="lead-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          aria-invalid={errors.phoneNumber ? true : undefined}
          aria-describedby={errors.phoneNumber ? 'lead-phone-error' : undefined}
          className={inputClass}
          // Bengali keyboards type ০১৭…; the schema expects ASCII digits.
          {...register('phoneNumber', { setValueAs: (value: string) => toAsciiDigits(value ?? '') })}
        />
        {errors.phoneNumber && (
          <p id="lead-phone-error" className="mt-1 text-xs font-medium text-zinc-950">
            {t.errors.phoneNumber}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="lead-email" className="mb-1 block text-sm font-medium text-zinc-700">
          {t.email} <span className="font-normal text-zinc-500">{t.optional}</span>
        </label>
        <input
          id="lead-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'lead-email-error' : undefined}
          className={inputClass}
          // An empty box must mean "no email", not an invalid email.
          {...register('email', {
            setValueAs: (value: string) => (value?.trim() ? value : undefined),
          })}
        />
        {errors.email && (
          <p id="lead-email-error" className="mt-1 text-xs font-medium text-zinc-950">
            {t.errors.email}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-md border-2 border-zinc-950 px-3 py-2 text-sm text-zinc-950">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || enteredAmount <= 0}
        className="mt-1 rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? t.submitting : t.submit}
      </button>

      <p className="text-xs text-zinc-500">{t.privacy}</p>
    </form>
  );
}
