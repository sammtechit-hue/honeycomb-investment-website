import type { Metadata } from 'next';
import { FormCard } from '@/components/dashboard/form';
import { Notice, PageHeader } from '@/components/dashboard/ui';
import { getEditRequests, requireInvestor } from '@/lib/investor';
import { EditForm } from './edit-form';

export const metadata: Metadata = {
  title: 'Request changes · HoneyComb Investor',
};

// The form's mobile field takes the number without +880 (see lib/phone.ts).
function localMobile(phone: string | null | undefined) {
  return phone ? phone.replace(/^\+880/, '0') : '';
}

export default async function EditProfilePage() {
  const { profile } = await requireInvestor('/dashboard/profile/edit');
  const pending = (await getEditRequests('/dashboard/profile/edit')).some((r) => r.status === 'PENDING');

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Request changes"
        description="Your name, NID and documents can only be changed by HoneyComb support. To change your bank account, add a new one from your profile."
      />

      {pending && (
        <Notice title="You already have a request in review">
          A new request is reviewed alongside it. Your profile updates once our team approves the change.
        </Notice>
      )}

      <FormCard title="Your details" description="Change what you need and submit. Our team checks every change before it applies.">
        <EditForm
          initial={{
            address: profile.address ?? '',
            profession: profile.profession ?? '',
            workplace: profile.workplace ?? '',
            nomineeName: profile.nominee?.nomineeName ?? '',
            nomineePhone: localMobile(profile.nominee?.nomineePhone),
            relation: profile.nominee?.relation ?? '',
          }}
        />
      </FormCard>
    </>
  );
}
