'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BankFields, EMPTY_BANK } from '@/app/verification/bank-fields';
import { bankFormSchema, toBankPayload, type BankValues } from '@/app/verification/schema';
import { Alert, FormActions } from '@/components/dashboard/form';
import { submitJson } from '@/lib/submit';

// New accounts are created inactive; payouts keep going to the current
// account until HoneyComb approves the new one.
export function BankForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<BankValues>({ resolver: zodResolver(bankFormSchema), defaultValues: EMPTY_BANK });

  async function onSubmit(values: BankValues) {
    setSubmitError(null);
    const result = await submitJson('/api/investor/bank-account', toBankPayload(values));
    if (result.ok) {
      router.push('/dashboard/profile?submitted=bank');
      router.refresh();
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field in values) form.setError(field as keyof BankValues, { message });
    }
    setSubmitError(result.message);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      <BankFields form={form} />
      <FormActions busy={form.formState.isSubmitting} label="Submit for review" cancelHref="/dashboard/profile" />
    </form>
  );
}
