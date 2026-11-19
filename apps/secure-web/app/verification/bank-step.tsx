'use client';

import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BankFields, EMPTY_BANK } from './bank-fields';
import { bankFormSchema, type BankValues } from './schema';
import { StepCard, StepFooter } from './ui';

export function BankStep({
  initial,
  onBack,
  onComplete,
}: {
  initial: BankValues | null;
  onBack: () => void;
  onComplete: (values: BankValues) => void;
}) {
  const form = useForm<BankValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: initial ?? EMPTY_BANK,
  });

  return (
    <StepCard
      eyebrow="Step 3 · Payout account"
      title="Bank details"
      description="Your monthly profit will be transferred to this account. These details are sent to the bank exactly as entered."
    >
      <form onSubmit={form.handleSubmit(onComplete)} noValidate className="flex flex-col gap-6">
        <BankFields form={form} />

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
