import Link from 'next/link';
import { TERMS_URL } from '@/lib/public-web';

// Header + footer shared by the registration flow (Create Account, Account
// Created, verification steps) — the "HoneyComb Shareholder Registry"
// frames in Figma.

const NAV = [
  { href: '/login', label: 'Sign In', key: 'signin' },
  { href: '/signup', label: 'Register', key: 'register' },
  { href: '/verification', label: 'Verification', key: 'verification' },
] as const;

type NavKey = (typeof NAV)[number]['key'];

export function RegistryHeader({ active }: { active: NavKey }) {
  return (
    <header className="sticky top-0 z-10 bg-surface/80 px-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] backdrop-blur-md sm:px-10">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-2 sm:px-6">
        <Link href="/" className="truncate text-base leading-7 font-bold tracking-[-0.5px] uppercase sm:text-xl">
          HoneyComb <span className="hidden sm:inline">Shareholder Registry</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm leading-5 sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === active ? 'page' : undefined}
              className={item.key === active ? 'text-black' : 'text-secondary hover:text-black'}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function RegistryFooter() {
  return (
    <footer className="bg-addon px-4 sm:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-2 px-2 py-8 text-center text-xs leading-4 text-secondary sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} HoneyComb Inc. All rights reserved.</p>
        <span aria-hidden className="hidden sm:inline">•</span>
        <a href={TERMS_URL} className="underline underline-offset-2">
          Institutional Terms
        </a>
      </div>
    </footer>
  );
}
