import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, hasLocale, type Locale } from '@/lib/i18n/config';

// Every page lives under /en or /bn. A path without a locale is redirected:
// to the language the visitor picked before (cookie), else the first
// supported language in their browser's Accept-Language, else the default.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

function pickLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (hasLocale(saved)) return saved;

  // "bn-BD,bn;q=0.9,en-US;q=0.8" → languages by descending q.
  const preferred = (request.headers.get('accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { language: tag.split('-')[0].toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  const match = preferred.find(({ language }) => hasLocale(language))?.language;
  return hasLocale(match) ? match : DEFAULT_LOCALE;
}

export const config = {
  // Skip Next internals, API routes and files with an extension
  // (favicon.ico, images in public/).
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
