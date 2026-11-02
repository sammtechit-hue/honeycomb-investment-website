import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { RegistryFooter, RegistryHeader } from '@/components/registry-shell';
import { TERMS_URL } from '@/lib/public-web';
import { redirectIfSignedIn } from '@/lib/session';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Create account · HoneyComb Investor',
};

export default async function SignupPage() {
  await redirectIfSignedIn();

  return (
    <div className="flex flex-1 flex-col bg-surface text-black">
      <RegistryHeader active="register" />

      <main className="flex flex-1 justify-center px-4 pt-6 pb-12">
        <div className="flex w-full max-w-[420px] flex-col items-center">
          <div className="flex flex-col items-center pb-8">
            <div className="pb-3">
              <div className="flex size-10 items-center justify-center">
                <Image src="/auth/honeycomb-emblem.svg" alt="" width={32} height={32} priority />
              </div>
            </div>
            <p className="text-center text-xs leading-4 font-bold tracking-[2.64px] uppercase">
              HoneyComb Inc.
            </p>
            <p className="pt-0.5 text-center text-xs leading-4 tracking-[1.92px] text-secondary uppercase">
              Project Shareholder Platform
            </p>
          </div>

          <div className="flex w-full flex-col gap-6 rounded-[10px] border border-hairline bg-white p-6 drop-shadow-[0px_4px_10px_rgba(0,0,0,0.03)] sm:p-8">
            <div className="flex flex-col gap-[7px]">
              <h1 className="text-2xl leading-8 font-bold tracking-[-0.6px]">Create your account</h1>
              <p className="text-xs leading-[19.5px] text-secondary">
                Takes about a minute. You&apos;ll verify your identity in the next step.
              </p>
            </div>
            <SignupForm termsUrl={TERMS_URL} />
          </div>

          <p className="flex gap-1 pt-6 text-center text-sm leading-5">
            <span className="text-secondary">Already registered?</span>
            <Link href="/login" className="underline decoration-rule underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <RegistryFooter />
    </div>
  );
}
