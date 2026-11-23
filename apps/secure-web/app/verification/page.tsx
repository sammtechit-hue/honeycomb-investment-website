import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { RegistryFooter } from '@/components/registry-shell';
import { getInvestments, getOpenProjects, getProfile, isApplication, type InvestorProfile } from '@/lib/investor';
import { requireSessionUser } from '@/lib/session';
import { ApplicationStatus, ApplicationSummary } from './application-summary';
import { VerificationHeader } from './header';
import { WizardLoader } from './wizard-loader';

export const metadata: Metadata = {
  title: 'Your application · HoneyComb Investor',
};

// An investor's home until their account is approved:
// - no application yet → the form (profile, nominee, bank, first investment, documents)
// - under review → the application, read-only
// - rejected → the reviewer's note, the application, and "Edit and resubmit"
// - approved → the portal
export default async function VerificationPage() {
  const user = await requireSessionUser('/verification');
  if (user.role !== 'INVESTOR') redirect('/');

  const profile = await getProfile('/verification');
  if (profile?.status === 'active') redirect('/dashboard');

  let content;
  if (!profile) {
    const projects = await getOpenProjects('/verification');
    content = <WizardLoader userId={user.id} projects={projects} />;
  } else if (isApplication(profile.status)) {
    // The application's investment is the investor's first one.
    const investments = await getInvestments('/verification');
    const investment = investments.at(-1) ?? null;
    content = (
      <div className="flex w-full max-w-[720px] flex-col gap-6">
        <ApplicationStatus profile={profile} />
        <ApplicationSummary profile={profile} investment={investment} />
      </div>
    );
  } else {
    content = <OnHold status={profile.status} />;
  }

  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <VerificationHeader />
      <main className="flex flex-1 justify-center px-4 pt-8 pb-12 sm:px-6 sm:pt-12">{content}</main>
      <RegistryFooter />
    </div>
  );
}

function OnHold({ status }: { status: InvestorProfile['status'] }) {
  return (
    <section className="flex h-fit w-full max-w-[420px] flex-col items-center rounded-lg bg-white p-6 text-center drop-shadow-[0px_1px_2px_rgba(0,0,0,0.06)] sm:p-8">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-surface-strong">
        <Image src="/auth/created-check.svg" alt="" width={16.3} height={12.025} />
      </div>
      <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.6px]">
        {status === 'deactivated' ? 'Your account is closed' : 'Your account is on hold'}
      </h1>
      <p className="pt-2 text-sm leading-5 text-secondary">Please contact HoneyComb support to find out more.</p>
    </section>
  );
}
