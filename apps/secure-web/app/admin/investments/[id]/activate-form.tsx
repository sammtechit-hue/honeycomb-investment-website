'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Field, FormActions, describedBy, inputClass } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

// Today's calendar date in Dhaka as YYYY-MM-DD. The API stamps the same
// date as the investment date when it activates the investment.
function dhakaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

// YYYY-MM-DD plus whole months, clamped to the month's last day
// (31 Jan + 1 month = 28/29 Feb, not 3 Mar).
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const targetMonth = m - 1 + months;
  const year = y + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  agreementEndDate: z
    .string()
    .regex(ISO_DATE, 'Choose the agreement end date')
    .refine((value) => value > dhakaToday(), 'The agreement must end after today'),
  agreementPlace: z.string().trim().max(150, 'Place cannot exceed 150 characters'),
});
type Values = z.infer<typeof schema>;

export function ActivateForm({ investmentId, termMonths }: { investmentId: string; termMonths: number | null }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      agreementEndDate: termMonths ? addMonths(dhakaToday(), termMonths) : '',
      agreementPlace: '',
    },
  });

  async function onSubmit(values: Values) {
    setSubmitError(null);
    const result = await submitJson(
      `/api/admin/investment/${investmentId}`,
      {
        status: 'active',
        agreementEndDate: values.agreementEndDate,
        ...(values.agreementPlace && { agreementPlace: values.agreementPlace }),
      },
      'PATCH',
    );
    if (result.ok) {
      router.refresh();
      return;
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          id="agreementEndDate"
          label="Agreement end date"
          hint={termMonths ? `Today + the ${termMonths}-month term` : undefined}
          error={errors.agreementEndDate?.message}
        >
          <input
            id="agreementEndDate"
            type="date"
            aria-invalid={!!errors.agreementEndDate}
            aria-describedby={describedBy('agreementEndDate', errors.agreementEndDate?.message, termMonths ? 'hint' : undefined)}
            {...register('agreementEndDate')}
            className={inputClass}
          />
        </Field>
        <Field id="agreementPlace" label="Agreement signed at" optional error={errors.agreementPlace?.message}>
          <input
            id="agreementPlace"
            autoComplete="off"
            placeholder="e.g. HoneyComb head office, Dhaka"
            aria-invalid={!!errors.agreementPlace}
            aria-describedby={describedBy('agreementPlace', errors.agreementPlace?.message)}
            {...register('agreementPlace')}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="text-xs leading-4 text-muted">
        The investment date is set to today when you activate. Profit starts 10 days after it.
      </p>
      <FormActions busy={isSubmitting} label="Activate investment" busyLabel="Activating…" />
    </form>
  );
}
