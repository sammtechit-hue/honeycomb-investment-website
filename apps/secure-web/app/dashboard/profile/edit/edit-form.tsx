'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nomineeFormSchema } from '@/app/verification/schema';
import { Alert, Field, FormActions, describedBy, inputClass } from '@/components/dashboard/form';
import { withCountryCode } from '@/lib/phone';
import { submitJson } from '@/lib/submit';

const schema = z
  .object({
    address: z.string().trim().min(5, 'Enter your full home address').max(500, 'Address cannot exceed 500 characters'),
    profession: z.string().trim().max(150, 'Profession cannot exceed 150 characters'),
    workplace: z.string().trim().max(150, 'Workplace cannot exceed 150 characters'),
  })
  .merge(nomineeFormSchema);
export type EditValues = z.infer<typeof schema>;

const PERSONAL = ['address', 'profession', 'workplace'] as const;
const NOMINEE = ['nomineeName', 'nomineePhone', 'relation'] as const;

// Sends only what changed. The API stages the changes for an admin to
// approve, so nothing on the profile changes until then.
export function EditForm({ initial }: { initial: EditValues }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ resolver: zodResolver(schema), defaultValues: initial });

  async function onSubmit(values: EditValues) {
    setSubmitError(null);
    const changed = (key: keyof EditValues) => values[key] !== initial[key];

    const body: Record<string, unknown> = {};
    for (const key of PERSONAL) if (changed(key) && values[key]) body[key] = values[key];
    const nominee: Record<string, string> = {};
    for (const key of NOMINEE) {
      if (changed(key)) nominee[key] = key === 'nomineePhone' ? withCountryCode(values[key]) : values[key];
    }
    if (Object.keys(nominee).length) body.nominee = nominee;

    if (!Object.keys(body).length) {
      setSubmitError('You haven’t changed anything yet.');
      return;
    }

    const result = await submitJson('/api/investor/update', body);
    if (result.ok) {
      router.push('/dashboard/profile?submitted=changes');
      router.refresh();
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field in values) setError(field as keyof EditValues, { message });
    }
    setSubmitError(result.message);
  }

  const text = (id: keyof EditValues, label: string, opts: { optional?: boolean; prefix?: string } = {}) => (
    <Field id={id} label={label} optional={opts.optional} error={errors[id]?.message}>
      <div className="relative">
        {opts.prefix && (
          <span className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-sm text-muted">
            {opts.prefix}
          </span>
        )}
        <input
          id={id}
          autoComplete="off"
          inputMode={opts.prefix ? 'tel' : undefined}
          aria-invalid={!!errors[id]}
          aria-describedby={describedBy(id, errors[id]?.message)}
          {...register(id)}
          className={`${inputClass} ${opts.prefix ? 'pl-14' : ''}`}
        />
      </div>
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}

      <p className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">Personal information</p>
      {text('address', 'Home address')}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {text('profession', 'Profession', { optional: true })}
        {text('workplace', 'Workplace', { optional: true })}
      </div>

      <p className="border-t border-hairline pt-6 text-xs leading-4 tracking-[0.6px] text-muted uppercase">Nominee</p>
      {text('nomineeName', 'Nominee name')}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {text('relation', 'Relation to you')}
        {text('nomineePhone', 'Nominee mobile', { prefix: '+880' })}
      </div>

      <FormActions busy={isSubmitting} label="Submit for review" cancelHref="/dashboard/profile" />
    </form>
  );
}
