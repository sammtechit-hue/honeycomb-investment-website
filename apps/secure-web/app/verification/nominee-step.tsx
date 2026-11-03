'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { nomineeFormSchema, type NomineeValues } from './schema';
import { Field, StepCard, StepFooter, describedBy, inputClass } from './ui';

const EMPTY: NomineeValues = { nomineeName: '', nomineePhone: '', relation: '' };

const RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister'];

export function NomineeStep({
  initial,
  onBack,
  onComplete,
}: {
  initial: NomineeValues | null;
  onBack: () => void;
  onComplete: (values: NomineeValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NomineeValues>({
    resolver: zodResolver(nomineeFormSchema),
    defaultValues: initial ?? EMPTY,
  });

  return (
    <StepCard
      eyebrow="Step 2 · Nominee"
      title="Nominee"
      description="The person you name as your nominee. You'll upload their NID and photograph in the last step."
    >
      <form onSubmit={handleSubmit(onComplete)} noValidate className="flex flex-col gap-6">
        <Field
          id="nomineeName"
          label="Nominee's full name"
          hint="As it appears on their NID"
          error={errors.nomineeName?.message}
        >
          <input
            id="nomineeName"
            autoComplete="off"
            aria-invalid={!!errors.nomineeName}
            aria-describedby={describedBy('nomineeName', errors.nomineeName?.message, 'hint')}
            {...register('nomineeName')}
            className={inputClass}
          />
        </Field>

        <Field id="nomineePhone" label="Nominee's mobile number" error={errors.nomineePhone?.message}>
          <div className="flex h-10 overflow-hidden rounded-md border border-hairline bg-canvas focus-within:border-black has-aria-invalid:border-2 has-aria-invalid:border-emphasis">
            <span className="flex items-center border-r border-hairline bg-surface-strong px-3 text-sm text-ink">
              +880
            </span>
            <input
              id="nomineePhone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="1712 345678"
              aria-invalid={!!errors.nomineePhone}
              aria-describedby={describedBy('nomineePhone', errors.nomineePhone?.message)}
              {...register('nomineePhone')}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-placeholder"
            />
          </div>
        </Field>

        <Field
          id="relation"
          label="Relationship to you"
          hint="Choose a suggestion or type your own"
          error={errors.relation?.message}
        >
          <input
            id="relation"
            list="relation-options"
            autoComplete="off"
            placeholder="e.g. Spouse"
            aria-invalid={!!errors.relation}
            aria-describedby={describedBy('relation', errors.relation?.message, 'hint')}
            {...register('relation')}
            className={inputClass}
          />
          <datalist id="relation-options">
            {RELATIONS.map((relation) => (
              <option key={relation} value={relation} />
            ))}
          </datalist>
        </Field>

        <StepFooter step={2} onBack={onBack} primaryLabel="Continue" />
      </form>
    </StepCard>
  );
}
