'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  investorApplicationRejectInputSchema,
  investorCategorySchema,
  nidNumberSchema,
  type InvestorApplicationRejectInput,
} from '@investment-platform/contracts/investor';
import { useConfirmStep } from '@/components/dashboard/confirm-step';
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
  const { submit, confirm } = useConfirmStep(
    'Approve this investor? Their account becomes active and their documents are marked verified.',
    onSubmit,
  );

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
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-5">
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
      <FormActions busy={isSubmitting} label="Approve investor" busyLabel="Approving…" confirm={confirm} />
    </form>
  );
}

// Sends the whole application (details, documents, bank, first investment)
// back to the investor. The reason is shown to them as written.
type RejectValues = InvestorApplicationRejectInput;

export function RejectForm({ investorId }: { investorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RejectValues>({
    resolver: zodResolver(investorApplicationRejectInputSchema),
    defaultValues: { reason: '' },
  });
  const { submit, confirm } = useConfirmStep(
    'Send the application back? The investor sees this note and their application unlocks for editing.',
    onSubmit,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center justify-center self-start rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
      >
        Send back to investor
      </button>
    );
  }

  async function onSubmit(values: RejectValues) {
    setSubmitError(null);
    const result = await submitJson(`/api/admin/investor/${investorId}/reject`, values, 'PATCH');
    if (result.ok) {
      router.refresh();
      return;
    }
    if (result.fieldErrors.reason) setError('reason', { message: result.fieldErrors.reason });
    setSubmitError(result.message);
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      <Field
        id="reason"
        label="What needs to change"
        hint="The investor sees this note exactly as written, then edits and resubmits their application."
        error={errors.reason?.message}
      >
        <textarea
          id="reason"
          rows={4}
          aria-invalid={!!errors.reason}
          aria-describedby={describedBy('reason', errors.reason?.message, 'hint')}
          {...register('reason')}
          className={`${inputClass} h-auto resize-y py-2.5 leading-5`}
        />
      </Field>
      {confirm.active && <p className="text-sm leading-5 text-ink">{confirm.message}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 items-center justify-center rounded-md bg-emphasis px-5 text-sm leading-5 text-white hover:bg-black/85 disabled:opacity-60"
        >
          {isSubmitting ? 'Sending back…' : confirm.active ? 'Yes, send back' : 'Send back'}
        </button>
        <button
          type="button"
          onClick={() => (confirm.active ? confirm.cancel() : setOpen(false))}
          disabled={isSubmitting}
          className="flex h-10 items-center justify-center rounded-md border border-hairline px-4 text-sm leading-5 text-ink hover:bg-surface"
        >
          Cancel
        </button>
      </div>
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
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<{ category: InvestorCategory }>({ resolver: zodResolver(categorySchema), defaultValues: { category } });

  async function onSubmit(values: { category: InvestorCategory }) {
    setSubmitError(null);
    const result = await submitJson(`/api/admin/investor/${investorId}`, { category: values.category }, 'PATCH');
    if (result.ok) {
      // The saved value becomes the new baseline, so the button disables again.
      reset(values);
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
