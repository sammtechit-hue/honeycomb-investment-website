import type { Locale } from './config';
import type { Dictionary } from './dictionaries/en';

// Loads one language's dictionary. Server-side callers only: Client
// Components get the slice they need as props, so the full copy never
// ships in the JS bundle. Kept apart from dictionaries.ts so Server Actions
// can use it without importing next/root-params.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en').then((module) => module.en),
  bn: () => import('./dictionaries/bn').then((module) => module.bn),
};

export function loadDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
