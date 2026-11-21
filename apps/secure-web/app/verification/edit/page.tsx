import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegistryFooter } from '@/components/registry-shell';
import { getInvestments, getOpenProjects, getProfile } from '@/lib/investor';
import { requireSessionUser } from '@/lib/session';
import { VerificationHeader } from '../header';
import { fromApplication } from '../schema';
import { WizardLoader } from '../wizard-loader';

export const metadata: Metadata = {
  title: 'Edit your application · HoneyComb Investor',
};

// A rejected application, opened in the same form it was submitted with and
// prefilled with what was sent. Only reachable while it's rejected.
export default async function EditApplicationPage() {
  const user = await requireSessionUser('/verification/edit');
  if (user.role !== 'INVESTOR') redirect('/');

  const profile = await getProfile('/verification/edit');
  if (profile?.status !== 'rejected') redirect('/verification');

  const [investments, projects] = await Promise.all([
    getInvestments('/verification/edit'),
    getOpenProjects('/verification/edit'),
  ]);
  const initial = fromApplication(profile, investments.at(-1) ?? null);

  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <VerificationHeader />
      <main className="flex flex-1 flex-col items-center gap-6 px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        {profile.rejectionReason && (
          <aside className="w-full max-w-[640px] rounded-md border-2 border-emphasis bg-white p-4 text-sm leading-5">
            <p className="pb-1 text-xs leading-4 tracking-[1.2px] text-muted uppercase">What to change</p>
            <p className="whitespace-pre-line text-ink">{profile.rejectionReason}</p>
          </aside>
        )}
        <WizardLoader
          userId={user.id}
          projects={projects}
          mode="resubmit"
          initial={initial}
          basePath="/verification/edit"
        />
      </main>
      <RegistryFooter />
    </div>
  );
}
