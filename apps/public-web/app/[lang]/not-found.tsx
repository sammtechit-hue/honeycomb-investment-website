import Link from 'next/link';
import { localePath } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

// The site's only 404 page. It renders inside app/[lang]/layout.tsx, so it
// keeps the header, footer and the visitor's language. Unknown URLs reach it
// through [...rest]/page.tsx; proxy.ts has already put them under /en or /bn.
export default async function NotFound() {
  const { locale, dict } = await getDictionary();

  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-sm font-medium text-zinc-600">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {dict.notFound.title}
        </h1>
        <p className="mt-4 text-zinc-600">{dict.notFound.body}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={localePath(locale, '/')}
            className="rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            {dict.notFound.home}
          </Link>
          <Link
            href={localePath(locale, '/#projects')}
            className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-950"
          >
            {dict.notFound.projects}
          </Link>
        </div>
      </div>
    </main>
  );
}
