'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalSchema, type PersonalValues } from './schema';
import { Field, StepCard, StepFooter, describedBy, inputClass } from './ui';

const EMPTY: PersonalValues = { fullName: '', address: '', profession: '', workplace: '', referralCode: '' };

export function PersonalStep({
  initial,
  onComplete,
}: {
  initial: PersonalValues | null;
  onComplete: (values: PersonalValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: initial ?? EMPTY,
  });

  return (
    <StepCard
      eyebrow="Step 1 · Your details"
      title="Personal info"
      description="Tell us who you are. Your name must match your National ID exactly."
    >
      <form onSubmit={handleSubmit(onComplete)} noValidate className="flex flex-col gap-6">
        <Field id="fullName" label="Full name" hint="As it appears on your NID" error={errors.fullName?.message}>
          <input
            id="fullName"
            autoComplete="name"
            placeholder="e.g. Rezwana Karim"
            aria-invalid={!!errors.fullName}
            aria-describedby={describedBy('fullName', errors.fullName?.message, 'hint')}
            {...register('fullName')}
            className={inputClass}
          />
        </Field>

        <Field id="address" label="Home address" error={errors.address?.message}>
          <textarea
            id="address"
            rows={3}
            autoComplete="street-address"
            placeholder="House, road, area, city"
            aria-invalid={!!errors.address}
            aria-describedby={describedBy('address', errors.address?.message)}
            {...register('address')}
            className={`${inputClass} h-auto resize-none py-2.5 leading-5`}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="profession" label="Profession" optional error={errors.profession?.message}>
            <input
              id="profession"
              autoComplete="organization-title"
              aria-invalid={!!errors.profession}
              aria-describedby={describedBy('profession', errors.profession?.message)}
              {...register('profession')}
              className={inputClass}
            />
          </Field>
          <Field id="workplace" label="Workplace" optional error={errors.workplace?.message}>
            <input
              id="workplace"
              autoComplete="organization"
              aria-invalid={!!errors.workplace}
              aria-describedby={describedBy('workplace', errors.workplace?.message)}
              {...register('workplace')}
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          id="referralCode"
          label="Referral code"
          optional
          hint="If another shareholder referred you, enter their code."
          error={errors.referralCode?.message}
        >
          <input
            id="referralCode"
            autoComplete="off"
            aria-invalid={!!errors.referralCode}
            aria-describedby={describedBy('referralCode', errors.referralCode?.message, 'hint')}
            {...register('referralCode')}
            className={`${inputClass} uppercase placeholder:normal-case`}
          />
        </Field>

        <StepFooter step={1} primaryLabel="Continue" />
      </form>
    </StepCard>
  );
}
