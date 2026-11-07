import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TERMS_URL } from '@/lib/public-web';

// Frame shared by the signed-out pages: sign in (shareholder and staff),
// forgot password, and reset / set password.
export function AuthShell({
  title,
  subtitle,
  children,
  below,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  // Rendered under the card, e.g. "New here? Create an account".
  below?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white text-black">
      <header className="sticky top-0 z-10 bg-white/80 px-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] backdrop-blur-md sm:px-10">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-2 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-[2px] bg-black text-xl leading-7 font-bold text-white">
              H
            </span>
            <span className="flex flex-col">
              <span className="text-xl leading-5 font-bold tracking-[-0.5px]">HONEYCOMB</span>
              <span className="pt-1 text-xs leading-3 tracking-[1.2px] text-muted uppercase">
                Investor
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-12">
        <div className="flex w-full max-w-[420px] flex-col items-center">
          <div className="flex flex-col items-center pb-8">
            <div className="pb-3">
              <div className="flex size-11 items-center justify-center rounded-[2px] bg-black drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                <Image src="/auth/honeycomb-mark.svg" alt="" width={24} height={24} priority />
              </div>
            </div>
            <p className="text-center text-base leading-6 font-bold tracking-[3.2px] uppercase">
              HoneyComb Inc.
            </p>
            <p className="pt-1 text-center text-xs leading-4 tracking-[1.2px] text-muted uppercase">
              Project Shareholder Platform
            </p>
          </div>

          <div className="flex w-full flex-col gap-6 rounded-[10px] bg-surface p-6 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] sm:p-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl leading-8 font-bold tracking-[-0.6px]">{title}</h1>
              <p className="text-sm leading-5 text-muted">{subtitle}</p>
            </div>
            {children}
          </div>

          {below}

          <p className="flex items-center gap-1.5 pt-8 text-xs leading-4 tracking-[-0.3px] text-muted">
            <Image src="/auth/lock.svg" alt="" width={10.6667} height={14} />
            256-bit encrypted bank-grade authentication
          </p>
        </div>
      </main>

      <footer className="bg-white px-4 sm:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-2 py-6 text-xs leading-4 sm:flex-row sm:items-center sm:justify-end sm:gap-6 sm:px-6">
          <p className="text-muted">
            © {new Date().getFullYear()} HoneyComb Inc. All rights reserved.
          </p>
          <a href={TERMS_URL} className="underline decoration-rule underline-offset-2">
            Institutional Terms
          </a>
        </div>
      </footer>
    </div>
  );
}
