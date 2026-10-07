import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { REGISTER_URL, SIGN_IN_URL } from '@/lib/site';
import { LanguageSwitcher } from './language-switcher';

export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link href={localePath(locale, '/')} className="flex items-center gap-2 text-zinc-950">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="currentColor" />
        <path d="M12 7.5 16 9.75v4.5L12 16.5l-4-2.25v-4.5z" fill="white" />
      </svg>
      <span className="text-base font-semibold tracking-tight">HoneyComb</span>
    </Link>
  );
}

// Sticky, so "Calculate return" and "Get started" stay one click away on
// desktop. On mobile the bottom bar (StickyCta) carries them instead.
export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const navLinks = [
    { href: '/#projects', label: dict.nav.projects },
    { href: '/#how-it-works', label: dict.nav.howItWorks },
    { href: '/#methodology', label: dict.nav.methodology },
    { href: '/#faq', label: dict.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo locale={locale} />

        <nav aria-label={dict.nav.main} className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm text-zinc-600">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={localePath(locale, link.href)} className="hover:text-zinc-950">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.nav.switchLanguage} />
          <a href={SIGN_IN_URL} className="px-2 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950">
            {dict.nav.signIn}
          </a>
          <Link
            href={localePath(locale, '/#calculator')}
            className="hidden rounded-md border border-zinc-950 px-3 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white md:inline-block"
          >
            {dict.nav.calculate}
          </Link>
          <a
            href={REGISTER_URL}
            className="hidden rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 md:inline-block"
          >
            {dict.nav.getStarted}
          </a>
        </div>
      </div>
    </header>
  );
}
