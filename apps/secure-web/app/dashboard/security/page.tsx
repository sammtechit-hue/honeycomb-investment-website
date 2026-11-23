import type { Metadata } from 'next';
import { FormCard } from '@/components/dashboard/form';
import { PageHeader } from '@/components/dashboard/ui';
import { formatDate } from '@/lib/format';
import { requireInvestor } from '@/lib/investor';
import { ChangePasswordForm, SignOutEverywhere } from './security-forms';

export const metadata: Metadata = {
  title: 'Security · HoneyComb Investor',
};

export default async function SecurityPage() {
  const { user } = await requireInvestor('/dashboard/security');

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Security"
        description={user.lastLoginAt ? `Last sign-in: ${formatDate(user.lastLoginAt)}` : undefined}
      />
      <FormCard title="Change password">
        <ChangePasswordForm />
      </FormCard>
      <FormCard
        title="Signed-in devices"
        description="If you signed in on a shared or lost device, sign out everywhere. You’ll need your password to sign back in."
      >
        <SignOutEverywhere />
      </FormCard>
    </>
  );
}
