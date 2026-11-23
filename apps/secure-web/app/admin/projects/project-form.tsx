'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Field, FormActions, describedBy, inputClass } from '@/components/dashboard/form';
import type { AdminProject } from '@/lib/admin';
import { submitJson } from '@/lib/submit';

// Create and edit form for a project. Fields mirror projectCreateInputSchema
// (packages/contracts/src/project.ts), with the cross-field checks the API
// makes on update also applied on create.

// Rates are stored as Decimal(3,2), so the database can't hold 10% or more.
export const MAX_RATE = 9.99;

const blank = (v: string) => v.trim() === '';
const toNumber = (v: string) => Number(v.replace(/,/g, ''));

const money = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .refine((v) => !required || !blank(v), `Enter the ${label}`)
    .refine((v) => blank(v) || (Number.isFinite(toNumber(v)) && toNumber(v) > 0), `Enter the ${label} in taka`);

const schema = z
  .object({
    name: z.string().trim().min(3, 'Project name must be at least 3 characters').max(150, 'Up to 150 characters'),
    description: z.string().trim().max(5000, 'Up to 5000 characters'),
    minimumInvestment: money('minimum investment', true),
    maximumInvestment: money('maximum investment', false),
    targetAmount: money('target amount', false),
    projectRate: z
      .string()
      .trim()
      .refine(
        (v) => blank(v) || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= MAX_RATE),
        `Enter a monthly rate between 0 and ${MAX_RATE}%`,
      ),
    startDate: z.string().min(1, 'Choose a start date'),
    endDate: z.string(),
    status: z.enum(['DRAFT', 'OPEN']),
    isVisible: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const min = toNumber(d.minimumInvestment);
    if (!blank(d.maximumInvestment) && toNumber(d.maximumInvestment) < min) {
      ctx.addIssue({ code: 'custom', path: ['maximumInvestment'], message: 'Must be at least the minimum investment' });
    }
    if (!blank(d.targetAmount) && toNumber(d.targetAmount) < min) {
      ctx.addIssue({ code: 'custom', path: ['targetAmount'], message: 'Must be at least the minimum investment' });
    }
    if (d.endDate && d.startDate && d.endDate <= d.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Must be after the start date' });
    }
  });

type Values = z.infer<typeof schema>;
type Key = keyof Values;

const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const amount = (value: string | null) => (value == null ? '' : String(Number(value)));

function initialValues(project?: AdminProject): Values {
  if (!project) {
    return {
      name: '',
      description: '',
      minimumInvestment: '10000',
      maximumInvestment: '',
      targetAmount: '',
      projectRate: '',
      startDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
      endDate: '',
      status: 'DRAFT',
      isVisible: true,
      isActive: true,
    };
  }
  return {
    name: project.name,
    description: project.description ?? '',
    minimumInvestment: amount(project.minimumInvestment),
    maximumInvestment: amount(project.maximumInvestment),
    targetAmount: amount(project.targetAmount),
    projectRate: amount(project.projectRate),
    startDate: dateOnly(project.startDate),
    endDate: dateOnly(project.endDate),
    // Status is changed with the actions on the project page, not here.
    status: 'DRAFT',
    isVisible: project.isVisible,
    isActive: project.isActive,
  };
}

export function ProjectForm({ project }: { project?: AdminProject }) {
  const router = useRouter();
  const editing = !!project;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initial = initialValues(project);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

  function body(values: Values) {
    const all: Record<string, unknown> = {
      name: values.name,
      description: values.description,
      minimumInvestment: toNumber(values.minimumInvestment),
      maximumInvestment: blank(values.maximumInvestment) ? undefined : toNumber(values.maximumInvestment),
      targetAmount: blank(values.targetAmount) ? undefined : toNumber(values.targetAmount),
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      isVisible: values.isVisible,
      isActive: values.isActive,
    };
    if (!editing) {
      return {
        ...all,
        status: values.status,
        projectRate: blank(values.projectRate) ? undefined : Number(values.projectRate),
      };
    }
    // PATCH only what changed.
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(all) as Key[]) {
      if (values[key] !== initial[key]) changed[key] = all[key];
    }
    return changed;
  }

  async function onSubmit(values: Values) {
    setSubmitError(null);

    // The API can't clear an optional value yet (see docs/backend-requests.md).
    if (editing) {
      for (const key of ['maximumInvestment', 'targetAmount', 'endDate'] as const) {
        if (blank(values[key]) && !blank(initial[key])) {
          setError(key, { message: 'This can’t be removed yet. Enter a new value instead.' });
          return;
        }
      }
    }

    const payload = body(values);
    if (editing && Object.keys(payload).length === 0) {
      router.push(`/admin/projects/${project.id}`);
      return;
    }

    const result = editing
      ? await submitJson(`/api/admin/project/${project.id}`, payload, 'PATCH')
      : await submitJson('/api/admin/project', payload);

    if (result.ok) {
      // The create response doesn't carry the new id, so land on the list
      // filtered to the new name.
      router.push(
        editing
          ? `/admin/projects/${project.id}`
          : `/admin/projects?q=${encodeURIComponent(values.name)}&status=all`,
      );
      router.refresh();
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field in values) setError(field as Key, { message });
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

      <Field id="name" label="Project name" error={errors.name?.message}>
        <input
          id="name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={describedBy('name', errors.name?.message)}
          {...register('name')}
          className={inputClass}
        />
      </Field>

      <Field
        id="description"
        label="Description"
        optional
        hint="Shown to investors when they choose a project."
        error={errors.description?.message}
      >
        <textarea
          id="description"
          rows={4}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy('description', errors.description?.message, 'hint')}
          {...register('description')}
          className={`${inputClass} h-auto resize-y py-2.5 leading-5`}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MoneyField id="minimumInvestment" label="Minimum (৳)" register={register} error={errors.minimumInvestment?.message} />
        <MoneyField
          id="maximumInvestment"
          label="Maximum (৳)"
          optional
          register={register}
          error={errors.maximumInvestment?.message}
        />
        <MoneyField id="targetAmount" label="Target (৳)" optional register={register} error={errors.targetAmount?.message} />
      </div>

      {editing ? (
        <div className="flex flex-col gap-1 rounded-md border border-hairline bg-surface p-4 text-sm leading-5">
          <span className="text-ink">
            Fixed monthly rate: <strong>{project.projectRate != null ? `${Number(project.projectRate)}%` : 'not set'}</strong>
          </span>
          <span className="text-xs leading-4 text-muted">
            The fixed rate can only be set when the project is created. Changing it needs a backend update.
          </span>
        </div>
      ) : (
        <Field
          id="projectRate"
          label="Fixed monthly rate (%)"
          optional
          hint="Applied to this project’s fixed-rate investments. Leave empty if the project only takes variable-rate investments; fixed-rate investments would otherwise be recorded at 0%."
          error={errors.projectRate?.message}
        >
          <input
            id="projectRate"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 2.5"
            aria-invalid={!!errors.projectRate}
            aria-describedby={describedBy('projectRate', errors.projectRate?.message, 'hint')}
            {...register('projectRate')}
            className={`${inputClass} tabular-nums sm:max-w-[200px]`}
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field id="startDate" label="Start date" hint="Investors can apply from this date." error={errors.startDate?.message}>
          <input
            id="startDate"
            type="date"
            aria-invalid={!!errors.startDate}
            aria-describedby={describedBy('startDate', errors.startDate?.message, 'hint')}
            {...register('startDate')}
            className={inputClass}
          />
        </Field>
        <Field id="endDate" label="End date" optional hint="No new investments after this date." error={errors.endDate?.message}>
          <input
            id="endDate"
            type="date"
            aria-invalid={!!errors.endDate}
            aria-describedby={describedBy('endDate', errors.endDate?.message, 'hint')}
            {...register('endDate')}
            className={inputClass}
          />
        </Field>
      </div>

      {!editing && (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm leading-5 text-ink">Start as</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['DRAFT', 'Draft', 'Not offered to investors yet. Open it from the project page when ready.'],
                ['OPEN', 'Open', 'Investors can apply as soon as the start date arrives.'],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer flex-col gap-1 rounded-md border border-hairline p-3 has-checked:border-black has-checked:bg-surface">
                <span className="flex items-center gap-2 text-sm leading-5 text-ink">
                  <input type="radio" value={value} {...register('status')} className="accent-black" />
                  {label}
                </span>
                <span className="text-xs leading-4 text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm leading-5 text-ink">
          <input type="checkbox" {...register('isVisible')} className="mt-0.5 accent-black" />
          <span>
            Visible to investors
            <span className="block text-xs leading-4 text-muted">Hidden projects don’t appear in the investment form.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-5 text-ink">
          <input type="checkbox" {...register('isActive')} className="mt-0.5 accent-black" />
          <span>
            Active
            <span className="block text-xs leading-4 text-muted">Inactive projects take no new investments.</span>
          </span>
        </label>
      </div>

      <FormActions
        busy={isSubmitting}
        label={editing ? 'Save changes' : 'Create project'}
        busyLabel={editing ? 'Saving…' : 'Creating…'}
        cancelHref={editing ? `/admin/projects/${project.id}` : '/admin/projects'}
      />
    </form>
  );
}

function MoneyField({
  id,
  label,
  optional,
  register,
  error,
}: {
  id: 'minimumInvestment' | 'maximumInvestment' | 'targetAmount';
  label: string;
  optional?: boolean;
  register: ReturnType<typeof useForm<Values>>['register'];
  error?: string;
}) {
  return (
    <Field id={id} label={label} optional={optional} error={error}>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error)}
        {...register(id)}
        className={`${inputClass} tabular-nums`}
      />
    </Field>
  );
}
