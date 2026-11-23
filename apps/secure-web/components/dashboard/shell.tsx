import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/sign-out-button';
import type { InvestorCategory } from '@/lib/investor';
import { DashboardNav } from './nav';
import type { NavItem } from './nav-items';

function Brand({ href, area }: { href: string; area: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="flex size-7 items-center justify-center bg-black">
        <Image src="/verify/header-mark.svg" alt="" width={12.1333} height={10.5} />
      </span>
      <span className="flex flex-col">
        <span className="text-base leading-5 font-bold tracking-[-0.4px] uppercase">HoneyComb</span>
        <span className="text-[11px] leading-4 tracking-[0.6px] text-muted uppercase">{area}</span>
      </span>
    </Link>
  );
}

export function categoryLabel(category: InvestorCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// The signed-in frame for both the investor dashboard and the admin panel:
// sidebar on desktop, sticky header with scrollable tabs on mobile.
export function DashboardShell({
  area,
  nav,
  signInHref,
  name,
  subtitle,
  badge,
  children,
}: {
  area: string;
  nav: NavItem[];
  signInHref: '/login' | '/staff/login';
  name: string;
  subtitle: string;
  // Shown under the name in the sidebar, e.g. "Gold tier" or "Admin".
  badge?: string;
  children: ReactNode;
}) {
  const home = nav[0]?.href ?? '/';

  return (
    <div className="flex flex-1 bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-hairline bg-white py-6 lg:flex">
        <div className="flex flex-col gap-8">
          <div className="px-6">
            <Brand href={home} area={area} />
          </div>
          <DashboardNav variant="sidebar" items={nav} />
        </div>
        <div className="mx-3 flex flex-col gap-3 rounded-lg bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emphasis text-sm font-semibold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm leading-5 font-semibold">{name}</span>
              <span className="truncate text-xs leading-4 text-muted">{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            {badge ? (
              <span className="text-xs leading-4 tracking-[0.6px] text-secondary uppercase">{badge}</span>
            ) : (
              <span />
            )}
            <SignOutButton signInHref={signInHref} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-col gap-3 bg-white/90 px-4 pt-3 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Brand href={home} area={area} />
            <SignOutButton signInHref={signInHref} />
          </div>
          <DashboardNav variant="tabs" items={nav} />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
