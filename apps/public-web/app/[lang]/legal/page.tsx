import type { Metadata } from 'next';
import Link from 'next/link';
import { LOCALES, localePath } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { createFormat, fill } from '@/lib/i18n/format';
import { VARIABLE_RATE_MAX_BPS, VARIABLE_RATE_MIN_BPS } from '@/lib/roi';
import { WITHDRAWAL_LIMIT } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getDictionary();
  return {
    title: dict.meta.legalTitle,
    alternates: {
      canonical: localePath(locale, '/legal'),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, '/legal')])),
    },
  };
}

// Final wording for each section must come from HoneyComb's legal adviser.
// Until it does, each section says so plainly and states only facts already
// fixed in the requirements brief.
export default async function LegalPage() {
  const { locale, dict } = await getDictionary();
  const f = createFormat(locale, dict.units);
  const values = {
    minRate: f.rate(VARIABLE_RATE_MIN_BPS),
    maxRate: f.rate(VARIABLE_RATE_MAX_BPS),
    withdrawalLimit: f.taka(WITHDRAWAL_LIMIT),
  };

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href={localePath(locale, '/')} className="text-sm text-zinc-600 hover:text-zinc-950">
          {dict.legal.back}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
          {dict.legal.title}
        </h1>
        <p className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {dict.legal.noticeBefore}
          <Link
            href={localePath(locale, '/#methodology')}
            className="underline underline-offset-2 hover:text-zinc-950"
          >
            {dict.legal.noticeLink}
          </Link>
          {dict.legal.noticeAfter}
        </p>

        {dict.legal.sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-10 scroll-mt-20">
            <h2 className="text-xl font-semibold text-zinc-950">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-700">
              {section.points.map((point) => (
                <li key={point}>{fill(point, values)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
