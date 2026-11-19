import type { Metadata } from 'next';
import { FormCard } from '@/components/dashboard/form';
import { PageHeader } from '@/components/dashboard/ui';
import { requireInvestor } from '@/lib/investor';
import { BankForm } from './bank-form';

export const metadata: Metadata = {
  title: 'Add a bank account · HoneyComb Investor',
};

export default async function AddBankPage() {
  await requireInvestor('/dashboard/profile/bank');

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Add a bank account"
        description="Profit and withdrawals keep going to your current account until our team approves the new one."
      />
      <FormCard
        title="New payout account"
        description="The account must be in your own name. These details are sent to the bank exactly as entered."
      >
        <BankForm />
      </FormCard>
    </>
  );
}
