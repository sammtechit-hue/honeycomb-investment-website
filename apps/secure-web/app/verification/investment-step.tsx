'use client';

import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatTaka } from '@/lib/format';
import type { OpenProject } from '@/lib/investor';
import { investmentFormSchema, parseAmount, type InvestmentValues } from './schema';
import { Field, StepCard, StepFooter, describedBy, inputClass } from './ui';

const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const TYPES = [
  { value: 'fixed', label: 'Fixed rate', hint: 'The same monthly rate for the whole term.' },
  { value: 'unfixed', label: 'Variable rate', hint: 'HoneyComb sets the rate each month, between 2% and 2.5%.' },
] as const;

// The project minimum depends on the list the server sent, so it's added
// to the shared rules here.
function makeSchema(projects: OpenProject[]) {
  return investmentFormSchema.superRefine((data, ctx) => {
    const project = projects.find((p) => p.id === data.projectId);
    if (data.projectId && !project) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'This project is no longer open. Choose another.' });
    }
    const amount = parseAmount(data.amount);
    if (project && Number.isFinite(amount) && amount > 0 && amount < Number(project.minimumInvestment)) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: `The minimum for this project is ${formatTaka(project.minimumInvestment)}`,
      });
    }
  });
}

export function InvestmentStep({
  initial,
  projects,
  onBack,
  onComplete,
}: {
  initial: InvestmentValues | null;
  projects: OpenProject[];
  onBack: () => void;
  onComplete: (values: InvestmentValues) => void;
}) {
  const schema = useMemo(() => makeSchema(projects), [projects]);
  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors },
  } = useForm<InvestmentValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? {
      projectId: projects.length === 1 ? projects[0].id : '',
      amount: '',
      investmentType: 'fixed',
      disbursementPeriod: 'monthly',
      investmentPeriodMonths: '12',
    },
  });
  const [projectId, investmentType] = useWatch({ control, name: ['projectId', 'investmentType'] });
  const project = projects.find((p) => p.id === projectId);

  return (
    <StepCard
      eyebrow="Step 4 · Your first investment"
      title="Investment"
      description="Choose a project and how much you want to invest. We review it together with your details, and you pay once your account is approved."
    >
      {projects.length === 0 ? (
        <div className="flex flex-col gap-6">
          <p className="rounded-md border border-hairline bg-surface p-4 text-sm leading-5 text-secondary">
            No projects are open for investment right now, so applications can&apos;t be completed. Please check
            back soon. Your details so far are saved in this tab.
          </p>
          <div className="flex justify-start border-t border-hairline pt-6">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface sm:px-6"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onComplete)} noValidate className="flex flex-col gap-6">
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
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 ${
                    investmentType === type.value ? 'border-black bg-surface' : 'border-hairline bg-canvas'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm leading-5 text-ink">
                    <input type="radio" value={type.value} {...register('investmentType')} className="accent-black" />
                    {type.label}
                  </span>
                  <span className="text-xs leading-4 text-muted">{type.hint}</span>
                </label>
              ))}
            </div>
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
                {...register('disbursementPeriod', { onChange: () => trigger('investmentPeriodMonths') })}
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
                aria-describedby={describedBy('investmentPeriodMonths', errors.investmentPeriodMonths?.message, 'hint')}
                {...register('investmentPeriodMonths')}
                className={`${inputClass} tabular-nums`}
              />
            </Field>
          </div>

          <div className="rounded-md border border-hairline bg-surface p-4 text-xs leading-5 text-secondary">
            Nothing is paid now. Once your account is approved, you&apos;ll pay HoneyComb directly (usually by bank
            transfer) and record the payment with your receipt in your portal. Profit starts 10 days after your
            investment date, and the first month is prorated.
          </div>

          <StepFooter step={4} onBack={onBack} primaryLabel="Continue" />
        </form>
      )}
    </StepCard>
  );
}
