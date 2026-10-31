import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';

// Any /en/... or /bn/... path with no page of its own. Calling notFound()
// here shows app/[lang]/not-found.tsx inside the site layout, in the
// visitor's language, instead of Next's unstyled default 404.
export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.meta.notFoundTitle };
}

export default function CatchAll() {
  notFound();
}
