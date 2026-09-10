'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  investorUpdateInputSchema,
  type InvestorUpdateInput,
} from '@investment-platform/contracts/investor';
import { updateInvestor } from './actions';

type Props = {
  investorId: string;
  defaultValues: Partial<InvestorUpdateInput>;
};

export function InvestorProfileForm({ investorId, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InvestorUpdateInput>({
    resolver: zodResolver(investorUpdateInputSchema),
    defaultValues,
  });

  const onSubmit = (values: InvestorUpdateInput) => {
    setStatus(null);
    startTransition(async () => {
      const result = await updateInvestor(investorId, values);
      setStatus({ ok: result.success, message: result.message });

      if (!result.success && result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof InvestorUpdateInput, { message: messages[0] });
          }
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Full name</span>
        <input {...register('fullName')} className="rounded border px-3 py-2" />
        {errors.fullName && (
          <span className="text-sm text-red-600">{errors.fullName.message}</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Email</span>
        <input {...register('email')} className="rounded border px-3 py-2" />
        {errors.email && (
          <span className="text-sm text-red-600">{errors.email.message}</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Address</span>
        <input {...register('address')} className="rounded border px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Profession</span>
        <input {...register('profession')} className="rounded border px-3 py-2" />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>

      {status && (
        <p className={status.ok ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
          {status.message}
        </p>
      )}
    </form>
  );
}
