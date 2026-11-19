'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  disbursementPeriodSchema,
  investmentPeriodDisbursementError,
  investmentTypeSchema,
} from '@investment-platform/contracts/investment';
import { Alert, Field, FormActions, Segmented, describedBy, inputClass } from '@/components/dashboard/form';
import { formatTaka } from '@/lib/format';
import type { OpenProject } from '@/lib/investor';
import { submitJson } from '@/lib/submit';

const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const TYPES = [
  { value: 'fixed', label: 'Fixed rate' },
  { value: 'unfixed', label: 'Variable rate' },
] as const;

const TYPE_HINT = {
  fixed: 'The same monthly rate for the whole term.',
  unfixed: 'HoneyComb sets the rate each month, between 2% and 2.5%.',
} as const;

type Values = {
  projectId: string;
  amount: string;
  investmentType: string;
  disbursementPeriod: string;
  investmentPeriodMonths: string;
};

function makeSchema(projects: OpenProject[]) {
  return z
    .object({
      projectId: z.string().min(1, 'Choose a project'),
      amount: z.string().trim().min(1, 'Enter an amount'),
      investmentType: investmentTypeSchema,
      disbursementPeriod: disbursementPeriodSchema,
      investmentPeriodMonths: z.string().trim().min(1, 'Enter the investment term'),
    })
    .superRefine((data, ctx) => {
      const amount = Number(data.amount.replace(/,/g, ''));
      const project = projects.find((p) => p.id === data.projectId);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount in taka' });
      } else if (project && amount < Number(project.minimumInvestment)) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `The minimum for this project is ${formatTaka(project.minimumInvestment)}`,
        });
      }

      const termError = investmentPeriodDisbursementError({
        investmentPeriodMonths: Number(data.investmentPeriodMonths),
        disbursementPeriod: data.disbursementPeriod,
      });
      if (termError) ctx.addIssue({ code: 'custom', path: ['investmentPeriodMonths'], message: termError });
    });
}

export function InvestForm({ projects, initialProjectId }: { projects: OpenProject[]; initialProjectId?: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schema = useMemo(() => makeSchema(projects), [projects]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: initialProjectId ?? (projects.length === 1 ? projects[0].id : ''),
      amount: '',
      investmentType: 'fixed',
      disbursementPeriod: 'monthly',
      investmentPeriodMonths: '12',
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;
  const [projectId, investmentType] = useWatch({ control, name: ['projectId', 'investmentType'] });
  const project = projects.find((p) => p.id === projectId);

  async function onSubmit(values: Values) {
    setSubmitError(null);
    const result = await submitJson('/api/investment', {
      projectId: values.projectId,
      amount: Number(values.amount.replace(/,/g, '')),
      investmentType: values.investmentType,
      disbursementPeriod: values.disbursementPeriod,
      investmentPeriodMonths: Number(values.investmentPeriodMonths),
    });

    if (result.ok) {
      router.push('/dashboard/investments?submitted=investment');
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

      <Field id="projectId" label="Project" error={errors.projectId?.message}>
        <select
          id="projectId"
          aria-invalid={!!errors.projectId}
          aria-describedby={describedBy('projectId', errors.projectId?.message)}
          {...register('projectId')}
          className={inputClass}
        >
          <option value="" disabled>
            Choose a project
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      {project?.description && <p className="-mt-3 text-sm leading-5 text-muted">{project.description}</p>}

      <Field
        id="amount"
        label="Amount (৳)"
        meta={project ? `Minimum ${formatTaka(project.minimumInvestment)}` : undefined}
        error={errors.amount?.message}
      >
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 100000"
          aria-invalid={!!errors.amount}
          aria-describedby={describedBy('amount', errors.amount?.message)}
          {...register('amount')}
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm leading-5 text-ink">
          Rate type <span aria-hidden>*</span>
        </legend>
        <Segmented
          name="Rate type"
          options={TYPES}
          value={investmentType}
          onChange={(value) => setValue('investmentType', value, { shouldValidate: true })}
        />
        <p className="text-xs leading-4 text-muted">
          {TYPE_HINT[investmentType as keyof typeof TYPE_HINT]}
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          id="disbursementPeriod"
          label="Profit payout"
          hint="How often profit is sent to your bank account."
          error={errors.disbursementPeriod?.message}
        >
          <select
            id="disbursementPeriod"
            aria-describedby={describedBy('disbursementPeriod', errors.disbursementPeriod?.message, 'hint')}
            {...register('disbursementPeriod', { onChange: () => form.trigger('investmentPeriodMonths') })}
            className={inputClass}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="investmentPeriodMonths"
          label="Term (months)"
          hint="A whole number of payout periods."
          error={errors.investmentPeriodMonths?.message}
        >
          <input
            id="investmentPeriodMonths"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.investmentPeriodMonths}
            aria-describedby={describedBy(
              'investmentPeriodMonths',
              errors.investmentPeriodMonths?.message,
              'hint',
            )}
            {...register('investmentPeriodMonths')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      <div className="rounded-md border border-hairline bg-surface p-4 text-xs leading-5 text-secondary">
        Profit starts 10 days after your investment date, and the first month is prorated. Your request is
        reviewed by HoneyComb. After submitting, pay HoneyComb directly (usually by bank transfer) and record the
        payment with your receipt from <span className="font-semibold text-ink">My investments</span>.
      </div>

      <FormActions busy={isSubmitting} label="Submit investment request" cancelHref="/dashboard/investments" />
    </form>
  );
}
