import type { Locale } from './config';
import type { Dictionary } from './dictionaries/en';
import { API_BASE_URL, isShowDemo } from '../site';

// Loads one language's dictionary. Server-side callers only: Client
// Components get the slice they need as props, so the full copy never
// ships in the JS bundle. Kept apart from dictionaries.ts so Server Actions
// can use it without importing next/root-params.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en').then((module) => module.en),
  bn: () => import('./dictionaries/bn').then((module) => module.bn),
};

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const output = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== undefined && sourceVal !== null) {
      output[key] = sourceVal;
    }
  }

  return output as T;
}

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  const baseDict = await dictionaries[locale]();

  if (isShowDemo()) {
    return baseDict;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/public-content?lang=${locale}`, {
      next: { revalidate: 86400, tags: ['content', `content-${locale}`] },
    });

    if (res.ok) {
      const json = await res.json();
      const content = json?.data ?? json;

      if (content && typeof content === 'object') {
        return deepMerge(baseDict, content);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic content from API, using static dictionary:', error);
  }

  return baseDict;
}
