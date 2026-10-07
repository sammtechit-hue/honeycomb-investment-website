// Locale settings shared by the proxy, Server Components and Client
// Components. Keep this file free of server-only imports.

export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];

// Used when neither the cookie nor the browser's Accept-Language names a
// supported language.
export const DEFAULT_LOCALE: Locale = 'en';

// Set by the language switcher so a later visit to "/" lands on the
// visitor's chosen language instead of the browser default.
export const LOCALE_COOKIE = 'NEXT_LOCALE';

// BCP 47 tags handed to Intl. en-IN gives the Bangladeshi lakh grouping
// (5,00,000); bn-BD gives the same grouping in Bengali digits (৫,০০,০০০).
export const INTL_TAG: Record<Locale, string> = {
  en: 'en-IN',
  bn: 'bn-BD',
};

// Each language's own name, for the switcher.
export const LOCALE_NAME: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
};

export function hasLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

// Prefixes an in-site path with the locale: localePath('bn', '/legal#risk')
// → '/bn/legal#risk', localePath('bn', '/#faq') → '/bn#faq'.
export function localePath(locale: Locale, path: string): string {
  return `/${locale}${path.startsWith('/#') ? path.slice(1) : path === '/' ? '' : path}`;
}

// Bengali keyboards type ০–৯. Inputs that expect digits accept either set.
export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6));
}
