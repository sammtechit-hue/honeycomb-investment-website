// Importing next/root-params makes this module Server Component-only.
import { notFound } from 'next/navigation';
import { lang } from 'next/root-params';
import { hasLocale, type Locale } from './config';
import type { Dictionary } from './dictionaries/en';
import { loadDictionary } from './load-dictionary';

// The locale of the current route (app/[lang]), for Server Components.
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return locale;
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: await loadDictionary(locale) };
}
