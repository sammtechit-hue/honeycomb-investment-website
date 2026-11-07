import type { Metadata } from 'next';
import Link from 'next/link';
import { RegistryFooter } from '@/components/registry-shell';
import { SignOutButton } from '@/components/sign-out-button';
import { requireSessionUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'HoneyComb Investor',
};

const ROLE_LABEL = {
  INVESTOR: 'Project Shareholder',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
} as const;

// Placeholder home until the shareholder dashboard and admin panel exist:
// shows who is signed in and where to go next.
export default async function Home() {
  const user = await requireSessionUser('/');
  const isInvestor = user.role === 'INVESTOR';

  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <header className="bg-surface/80 px-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] sm:px-10">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-2 sm:px-6">
          <span className="text-base leading-7 font-bold tracking-[-0.5px] uppercase sm:text-xl">HoneyComb</span>
          <SignOutButton signInHref={isInvestor ? '/login' : '/staff/login'} />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pt-8 pb-12 sm:pt-12">
        <section className="flex h-fit w-full max-w-[420px] flex-col gap-4 rounded-lg bg-white p-6 drop-shadow-[0px_1px_2px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="flex flex-col gap-1">
            <p className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{ROLE_LABEL[user.role]}</p>
            <h1 className="text-2xl leading-8 font-bold tracking-[-0.6px] break-all">
              {isInvestor && user.phone ? user.phone : user.email}
            </h1>
          </div>
          {isInvestor ? (
            <>
              <p className="text-sm leading-5 text-secondary">
                Your dashboard is on its way. Meanwhile you can check or complete your verification.
              </p>
              <Link
                href="/verification"
                className="flex h-11 w-full items-center justify-center rounded-md bg-emphasis text-sm leading-5 text-white hover:bg-black/85"
              >
                Go to verification
              </Link>
            </>
          ) : (
            <p className="text-sm leading-5 text-secondary">
              You are signed in to your staff account. The admin panel is not available yet.
            </p>
          )}
        </section>
      </main>

      <RegistryFooter />
    </div>
  );
}
