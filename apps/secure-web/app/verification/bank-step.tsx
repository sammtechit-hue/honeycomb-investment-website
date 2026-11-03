'use client';

import Image from 'next/image';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CITY_BANK_NAME, bankFormSchema, type BankValues } from './schema';
import { Field, FieldError, StepCard, StepFooter, describedBy, inputClass } from './ui';

const EMPTY: BankValues = {
  selectedBank: 'city_bank',
  bankName: '',
  branchName: '',
  accountName: '',
  accountNumber: '',
  routingNumber: '',
  accountType: '',
};

export function BankStep({
  initial,
  onBack,
  onComplete,
}: {
  initial: BankValues | null;
  onBack: () => void;
  onComplete: (values: BankValues) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<BankValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: initial ?? EMPTY,
  });

  const [selectedBank, accountType] = useWatch({ control, name: ['selectedBank', 'accountType'] });
  const isOtherBank = selectedBank === 'others';

  return (
    <StepCard
      eyebrow="Step 3 · Payout account"
      title="Bank details"
      description="Your monthly profit will be transferred to this account. These details are sent to the bank exactly as entered."
    >
      <form onSubmit={handleSubmit(onComplete)} noValidate className="flex flex-col gap-6">
        <Field
          id="selectedBank"
          label="Bank"
          meta={isOtherBank ? 'BEFTN transfer' : 'Direct transfer'}
          hint="City Bank accounts are paid directly. Other banks are paid through BEFTN."
        >
          <div className="relative">
            <select
              id="selectedBank"
              aria-describedby="selectedBank-hint"
              {...register('selectedBank')}
              className={`${inputClass} appearance-none pr-9`}
            >
              <option value="city_bank">{CITY_BANK_NAME}</option>
              <option value="others">Another bank</option>
            </select>
            <Image
              src="/verify/chevron-down.svg"
              alt=""
              width={10}
              height={6.16667}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
        </Field>

        {isOtherBank && (
          <Field id="bankName" label="Bank name" error={errors.bankName?.message}>
            <input
              id="bankName"
              autoComplete="off"
              placeholder="e.g. BRAC Bank PLC"
              aria-invalid={!!errors.bankName}
              aria-describedby={describedBy('bankName', errors.bankName?.message)}
              {...register('bankName')}
              className={inputClass}
            />
          </Field>
        )}

        <Field id="branchName" label="Branch name" error={errors.branchName?.message}>
          <input
            id="branchName"
            autoComplete="off"
            placeholder="e.g. Dhanmondi Branch"
            aria-invalid={!!errors.branchName}
            aria-describedby={describedBy('branchName', errors.branchName?.message)}
            {...register('branchName')}
            className={inputClass}
          />
        </Field>

        <Field
          id="accountName"
          label="Account holder name"
          hint="Enter it exactly as it appears on your bank record. A mismatch will cause the transfer to fail."
          error={errors.accountName?.message}
        >
          <input
            id="accountName"
            autoComplete="off"
            aria-invalid={!!errors.accountName}
            aria-describedby={describedBy('accountName', errors.accountName?.message, 'hint')}
            {...register('accountName')}
            className={inputClass}
          />
        </Field>

        <Field id="accountNumber" label="Account number" error={errors.accountNumber?.message}>
          <div className="relative">
            <input
              id="accountNumber"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.accountNumber}
              aria-describedby={describedBy('accountNumber', errors.accountNumber?.message)}
              {...register('accountNumber')}
              className={`${inputClass} pr-9 tracking-[0.7px]`}
            />
            <Image
              src="/verify/field-lock.svg"
              alt=""
              width={12}
              height={15.75}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
        </Field>

        {isOtherBank && (
          <Field id="routingNumber" label="Routing number" meta="9 digits" error={errors.routingNumber?.message}>
            <div className="relative">
              <input
                id="routingNumber"
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                aria-invalid={!!errors.routingNumber}
                aria-describedby={describedBy('routingNumber', errors.routingNumber?.message)}
                {...register('routingNumber')}
                className={`${inputClass} pr-9 tracking-[0.7px]`}
              />
              {errors.routingNumber && (
                <Image
                  src="/verify/field-error.svg"
                  alt=""
                  width={16.6667}
                  height={16.6667}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                />
              )}
            </div>
          </Field>
        )}

        <fieldset className="flex flex-col gap-2" aria-describedby={errors.accountType ? 'accountType-error' : undefined}>
          <legend className="pb-2 text-sm leading-5 text-ink">
            Account type <span aria-hidden>*</span>
          </legend>
          <div className="flex rounded-lg border border-hairline bg-chip p-[5px]" role="radiogroup">
            {(['savings', 'current'] as const).map((type) => {
              const checked = accountType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setValue('accountType', type, { shouldValidate: true })}
                  className={`flex-1 rounded-md py-2 text-sm leading-5 capitalize ${
                    checked ? 'bg-black text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]' : 'text-muted hover:text-ink'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
          {errors.accountType && <FieldError id="accountType-error" message={errors.accountType.message} />}
        </fieldset>

        <div className="flex items-start gap-3 rounded-md border border-hairline bg-addon p-4">
          <Image src="/verify/shield-note.svg" alt="" width={13.3333} height={18.6667} className="shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-xs leading-4 font-bold tracking-[0.3px] text-ink uppercase">
              The account must be in your name
            </p>
            <p className="text-xs leading-4 text-muted">
              Profit is paid monthly. Transfers to an account held by anyone else will be rejected.
            </p>
          </div>
        </div>

        <StepFooter step={3} onBack={onBack} primaryLabel="Continue" />
      </form>
    </StepCard>
  );
}
