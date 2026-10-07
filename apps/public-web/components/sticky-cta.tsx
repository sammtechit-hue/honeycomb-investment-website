import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { REGISTER_URL } from '@/lib/site';

// Mobile-only bottom bar. The page adds matching bottom padding below md so
// this never covers the footer.
export function StickyCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex gap-2">
        <Link
          href={localePath(locale, '/#calculator')}
          className="flex-1 rounded-md border border-zinc-950 px-3 py-2.5 text-center text-sm font-medium text-zinc-950"
        >
          {dict.nav.calculate}
        </Link>
        <a
          href={REGISTER_URL}
          className="flex-1 rounded-md bg-zinc-950 px-3 py-2.5 text-center text-sm font-medium text-white"
        >
          {dict.nav.getStarted}
        </a>
      </div>
    </div>
  );
}
