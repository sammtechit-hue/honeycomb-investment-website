import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { RegistryFooter, RegistryHeader } from '@/components/registry-shell';
import { requireSessionUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Account created · HoneyComb Investor',
};

// KYC = shareholder NID + photo, nominee NID + photo, home address, bank
// account. Never list a trade licence here — investors must not be asked
// for one.
const REQUIRED_DOCUMENTS = [
  {
    icon: { src: '/auth/doc-nid.svg', width: 11.6667, height: 11.6667 },
    title: 'National ID (NID)',
    detail: 'Smart card or government-issued plastic NID',
  },
  {
    icon: { src: '/auth/doc-photo.svg', width: 10.5, height: 10.5 },
    title: 'Passport-size photograph',
    detail: 'Recent portrait with a neutral white backdrop',
  },
  {
    icon: { src: '/auth/doc-file.svg', width: 9.33333, height: 11.6667 },
    title: "Nominee's NID and photograph",
    detail: 'For the person you name as your nominee',
  },
];

export default async function AccountCreatedPage() {
  await requireSessionUser('/signup/complete');

  return (
    <div className="flex flex-1 flex-col bg-surface text-black">
      <RegistryHeader active="register" />

      <main className="flex flex-1 justify-center px-4 pt-6 pb-12">
        <div className="flex w-full max-w-[420px] flex-col items-center">
          <div className="flex flex-col items-center pb-6">
            <Image src="/auth/honeycomb-seal.svg" alt="" width={40} height={40} priority />
            <p className="pt-2 text-xs leading-4 tracking-[2.4px] text-secondary uppercase">
              Institutional Protocol
            </p>
          </div>

          <div className="flex w-full flex-col items-center rounded-lg bg-white p-6 drop-shadow-[0px_1px_2px_rgba(0,0,0,0.06)] sm:p-8">
            <div className="pb-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-surface-strong">
                <Image src="/auth/created-check.svg" alt="" width={16.3} height={12.025} />
              </div>
            </div>
            <h1 className="text-center text-2xl leading-8 font-bold tracking-[-0.6px] text-ink">
              Account created
            </h1>
            <p className="pt-2 text-center text-sm leading-5 text-secondary">
              Next, verify your identity to activate your Project Shareholder participation
              rights. You will need your NID and a passport-size photograph, your
              nominee&apos;s NID and photograph, your home address and your bank account details.
            </p>

            <div className="w-full pt-6">
              <div className="flex flex-col gap-3 rounded-[2px] bg-addon p-4">
                <div className="flex items-center justify-between pb-2 text-xs leading-4">
                  <p className="font-bold tracking-[0.6px] text-ink uppercase">
                    Required verification documents
                  </p>
                  <p className="text-secondary">
                    {String(REQUIRED_DOCUMENTS.length).padStart(2, '0')} Items
                  </p>
                </div>
                <ul className="flex flex-col gap-3">
                  {REQUIRED_DOCUMENTS.map((doc) => (
                    <li key={doc.title} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[2px] bg-surface-strong">
                        <Image src={doc.icon.src} alt="" width={doc.icon.width} height={doc.icon.height} />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm leading-[17.5px] text-ink">{doc.title}</span>
                        <span className="text-xs leading-4 text-secondary">{doc.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="flex w-full items-center gap-2 px-1 pt-4 text-xs leading-4 text-secondary">
              <Image src="/auth/lock-secondary.svg" alt="" width={10.6667} height={14} />
              Your documents are stored encrypted on our secure server.
            </p>

            <div className="flex w-full flex-col items-center gap-4 pt-6">
              <Link
                href="/verification"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emphasis text-sm leading-5 text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-black/85"
              >
                Start verification
                <Image src="/auth/arrow-right.svg" alt="" width={12} height={12} />
              </Link>
              <Link
                href="/"
                className="text-center text-sm leading-5 text-secondary underline decoration-rule underline-offset-2"
              >
                I&apos;ll do this later
              </Link>
            </div>
          </div>
        </div>
      </main>

      <RegistryFooter />
    </div>
  );
}
