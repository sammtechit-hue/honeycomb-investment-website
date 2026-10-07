import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { createFormat, fill } from '@/lib/i18n/format';
import { Logo } from './site-header';

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const f = createFormat(locale, dict.units);
  const t = dict.footer;

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Logo locale={locale} />
            <p className="mt-3 max-w-sm text-sm text-zinc-600">{t.about}</p>
          </div>

          <FooterLinks
            locale={locale}
            heading={t.platform}
            links={[
              { href: '/#projects', label: t.projects },
              { href: '/#how-it-works', label: t.howItWorks },
              { href: '/#calculator', label: t.calculator },
              { href: '/#faq', label: t.faq },
            ]}
          />
          <FooterLinks
            locale={locale}
            heading={t.legal}
            links={[
              { href: '/#methodology', label: t.methodology },
              { href: '/legal#risk', label: t.risk },
              { href: '/legal#terms', label: t.terms },
              { href: '/legal#privacy', label: t.privacy },
            ]}
          />
        </div>

        <p className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          {fill(t.copyright, { year: f.plain(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  );
}

function FooterLinks({
  locale,
  heading,
  links,
}: {
  locale: Locale;
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={heading}>
      <h2 className="text-sm font-semibold text-zinc-950">{heading}</h2>
      <ul className="mt-3 space-y-2 text-sm text-zinc-600">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={localePath(locale, link.href)} className="hover:text-zinc-950">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
