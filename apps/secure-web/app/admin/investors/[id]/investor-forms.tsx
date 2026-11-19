'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { investorCategorySchema, nidNumberSchema } from '@investment-platform/contracts/investor';
import { Alert, Field, FormActions, describedBy, inputClass } from '@/components/dashboard/form';
import type { InvestorCategory } from '@/lib/investor';
import { submitJson } from '@/lib/submit';

const CATEGORIES = investorCategorySchema.options;
const label = (c: InvestorCategory) => c.charAt(0).toUpperCase() + c.slice(1);

function CategorySelect({ registration }: { registration: UseFormRegisterReturn<'category'> }) {
  return (
    <select id="category" {...registration} className={inputClass}>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {label(c)}
        </option>
      ))}
    </select>
  );
}

// Approval: the admin copies both NID numbers from the uploaded NID images
// (the API refuses approval without them), picks the category, and the
// investor becomes active with their documents marked verified.
const approveSchema = z.object({
  nidNumber: nidNumberSchema,
  nomineeNidNumber: nidNumberSchema,
  category: investorCategorySchema,
});
type ApproveValues = z.infer<typeof approveSchema>;

export function ApproveForm({
  investorId,
  initial,
}: {
  investorId: string;
  initial: { nidNumber: string; nomineeNidNumber: string; category: InvestorCategory };
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApproveValues>({ resolver: zodResolver(approveSchema), defaultValues: initial });

  async function onSubmit(values: ApproveValues) {
    setSubmitError(null);
    const result = await submitJson(
      `/api/admin/investor/${investorId}`,
      {
        status: 'active',
        nidNumber: values.nidNumber,
        category: values.category,
        nominee: { nomineeNidNumber: values.nomineeNidNumber },
        kycDocuments: { verificationStatus: 'verified' },
      },
      'PATCH',
    );
    if (result.ok) {
      router.refresh();
      return;
    }
    if (result.fieldErrors.nidNumber) setError('nidNumber', { message: result.fieldErrors.nidNumber });
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
        <Field id="nidNumber" label="Investor NID number" hint="From the NID images above" error={errors.nidNumber?.message}>
          <input
            id="nidNumber"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.nidNumber}
            aria-describedby={describedBy('nidNumber', errors.nidNumber?.message, 'hint')}
            {...register('nidNumber')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field
          id="nomineeNidNumber"
          label="Nominee NID number"
          hint="From the nominee’s NID images"
          error={errors.nomineeNidNumber?.message}
        >
          <input
            id="nomineeNidNumber"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.nomineeNidNumber}
            aria-describedby={describedBy('nomineeNidNumber', errors.nomineeNidNumber?.message, 'hint')}
            {...register('nomineeNidNumber')}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>
      <Field id="category" label="Category" error={errors.category?.message}>
        <CategorySelect registration={register('category')} />
      </Field>
      <FormActions busy={isSubmitting} label="Approve investor" busyLabel="Approving…" />
    </form>
  );
}

const categorySchema = z.object({ category: investorCategorySchema });

export function CategoryForm({ investorId, category }: { investorId: string; category: InvestorCategory }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<{ category: InvestorCategory }>({ resolver: zodResolver(categorySchema), defaultValues: { category } });

  async function onSubmit(values: { category: InvestorCategory }) {
    setSubmitError(null);
    const result = await submitJson(`/api/admin/investor/${investorId}`, { category: values.category }, 'PATCH');
    if (result.ok) {
      router.refresh();
      return;
    }
    setSubmitError(result.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="category" className="text-sm leading-5 text-ink">
            Category
          </label>
          <CategorySelect registration={register('category')} />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex h-10 items-center justify-center rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Change category'}
        </button>
      </div>
    </form>
  );
}
