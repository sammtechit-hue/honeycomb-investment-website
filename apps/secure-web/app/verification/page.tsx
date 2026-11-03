import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegistryFooter } from '@/components/registry-shell';
import { apiFetch } from '@/lib/api';
import { requireSessionUser, sessionCookieHeader } from '@/lib/session';
import { WizardLoader } from './wizard-loader';

export const metadata: Metadata = {
  title: 'Verify your identity · HoneyComb Investor',
};

type InvestorProfile = {
  status: 'pending' | 'uploaded_kyc' | 'active' | 'suspended' | 'deactivated';
  kycDocuments: { verificationStatus: 'pending' | 'verified' | 'rejected' } | null;
};

export default async function VerificationPage() {
  const user = await requireSessionUser('/verification');
  if (user.role !== 'INVESTOR') redirect('/');

  const res = await apiFetch('/investor', { headers: { cookie: await sessionCookieHeader() } });
  if (res.status === 401) redirect('/api/auth/resume?next=%2Fverification');
  if (!res.ok && res.status !== 404) throw new Error(`GET /investor failed (${res.status})`);
  const profile = res.ok ? ((await res.json()) as InvestorProfile) : null;

  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <VerificationHeader />
      <main className="flex flex-1 justify-center px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        {profile ? <SubmittedStatus profile={profile} /> : <WizardLoader userId={user.id} />}
      </main>
      <RegistryFooter />
    </div>
  );
}

function VerificationHeader() {
  return (
    <header className="sticky top-0 z-10 bg-surface/80 px-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] backdrop-blur-md sm:px-10">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-2 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center bg-black">
            <Image src="/verify/header-mark.svg" alt="" width={12.1333} height={10.5} />
          </span>
          <span className="flex flex-col">
            <span className="text-base leading-6 font-bold tracking-[-0.4px] uppercase">HoneyComb Inc.</span>
            <span className="text-[11px] leading-4 tracking-[0.3px] text-muted uppercase sm:text-xs">
              Shareholder verification
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="hidden items-center gap-2 bg-addon px-3 py-1 text-xs leading-4 tracking-[0.6px] uppercase md:flex">
            <Image src="/verify/header-lock.svg" alt="" width={10.6667} height={14} />
            Encrypted connection
          </span>
          <Link href="/" className="text-sm leading-5 text-secondary hover:text-black">
            Exit
          </Link>
        </div>
      </div>
    </header>
  );
}

function SubmittedStatus({ profile }: { profile: InvestorProfile }) {
  const review = profile.kycDocuments?.verificationStatus;
  const content =
    profile.status === 'active'
      ? {
          title: "You're verified",
          body: 'Your identity has been verified and your account is active.',
          action: { href: '/', label: 'Go to your dashboard' },
        }
      : profile.status === 'suspended' || profile.status === 'deactivated'
        ? {
            title: 'Your account is on hold',
            body: 'Please contact HoneyComb support to find out more.',
            action: null,
          }
        : review === 'rejected'
          ? {
              title: "We couldn't verify your documents",
              body: 'Our verification team will contact you about what needs to change.',
              action: null,
            }
          : {
              title: 'Verification submitted',
              body: "Thanks — your details and documents are with our verification team. We'll update your account once the review is complete. You can check back here any time.",
              action: { href: '/', label: 'Back to home' },
            };

  return (
    <section className="flex h-fit w-full max-w-[420px] flex-col items-center rounded-lg bg-white p-6 text-center drop-shadow-[0px_1px_2px_rgba(0,0,0,0.06)] sm:p-8">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-surface-strong">
        <Image src="/auth/created-check.svg" alt="" width={16.3} height={12.025} />
      </div>
      <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.6px]">{content.title}</h1>
      <p className="pt-2 text-sm leading-5 text-secondary">{content.body}</p>
      {content.action && (
        <Link
          href={content.action.href}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-emphasis text-sm leading-5 text-white hover:bg-black/85"
        >
          {content.action.label}
        </Link>
      )}
    </section>
  );
}
