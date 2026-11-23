'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './nav-items';

// The first item is the area's home (/dashboard, /admin): it is only active
// on its own path, while the others also cover their sub-pages.
function isActive(pathname: string, href: string, home: string) {
  return href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// `sidebar` on desktop; `tabs` is the scrollable strip under the mobile header.
export function DashboardNav({ variant, items }: { variant: 'sidebar' | 'tabs'; items: NavItem[] }) {
  const pathname = usePathname();
  const home = items[0]?.href ?? '/';

  if (variant === 'tabs') {
    return (
      <nav aria-label="Main" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href, home);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm leading-5 whitespace-nowrap ${
                active ? 'bg-emphasis text-white' : 'text-secondary hover:bg-surface-strong hover:text-black'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = isActive(pathname, item.href, home);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm leading-5 ${
              active ? 'bg-surface-strong font-semibold text-black' : 'text-secondary hover:bg-surface hover:text-black'
            }`}
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
