'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALES, LOCALE_COOKIE, LOCALE_NAME, type Locale } from '@/lib/i18n/config';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Links to the same page in the other language, and remembers the choice in
// a cookie so the proxy sends a later visit to "/" to the same language.
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const target = LOCALES.find((l) => l !== locale) ?? locale;
  // pathname is /en/... or /bn/...; swap only the first segment.
  const href = `/${target}${pathname.replace(/^\/[^/]+/, '')}`;

  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={`${label}: ${LOCALE_NAME[target]}`}
      onClick={() => {
        try {
          document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
        } catch {
          // Cookies blocked — the link still switches language for this visit.
        }
      }}
      className="rounded-md px-2 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950"
    >
      {LOCALE_NAME[target]}
    </Link>
  );
}
