import Image from 'next/image';
import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';

export function VerificationHeader() {
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
              Investor application
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="hidden items-center gap-2 bg-addon px-3 py-1 text-xs leading-4 tracking-[0.6px] uppercase md:flex">
            <Image src="/verify/header-lock.svg" alt="" width={10.6667} height={14} />
            Encrypted connection
          </span>
          {/* Applicants can't open the portal yet, so sign-out lives here. */}
          <SignOutButton signInHref="/login" />
        </div>
      </div>
    </header>
  );
}
