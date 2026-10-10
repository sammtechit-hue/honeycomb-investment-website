import Link from 'next/link';
import { ProjectCard } from '@/components/project-card';
import { RoiCalculator } from '@/components/roi-calculator';
import { localePath } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { createFormat, fill } from '@/lib/i18n/format';
import { getGroupCompanies, getProjects, getTestimonials } from '@/lib/projects';
import {
  FIXED_RATE_BPS,
  VARIABLE_RATE_MAX_BPS,
  VARIABLE_RATE_MIN_BPS,
  monthlyProfit,
} from '@/lib/roi';
import { REGISTER_URL, WITHDRAWAL_LIMIT } from '@/lib/site';

// Worked example for the methodology section: one quarter on ৳5,00,000.
// Months are 0-based (6 = July).
const EXAMPLE_AMOUNT = 500_000;
const EXAMPLE_MONTHS = [
  { month: 6, rateBps: 230 },
  { month: 7, rateBps: 200 },
  { month: 8, rateBps: 250 },
];

export default async function Home() {
  const { locale, dict } = await getDictionary();
  const f = createFormat(locale, dict.units);
  const projects = await getProjects(locale);
  const companies = getGroupCompanies(locale);
  const testimonials = getTestimonials(locale);

  const rates = {
    fixedRate: f.rate(FIXED_RATE_BPS),
    minRate: f.rate(VARIABLE_RATE_MIN_BPS),
    maxRate: f.rate(VARIABLE_RATE_MAX_BPS),
  };
  const faqValues = { ...rates, withdrawalLimit: f.taka(WITHDRAWAL_LIMIT) };

  const exampleTotal = EXAMPLE_MONTHS.reduce(
    (sum, { rateBps }) => sum + monthlyProfit(EXAMPLE_AMOUNT, rateBps),
    0,
  );

  return (
    <main className="flex-1">
      {/* Hero: copy left, calculator right */}
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_460px] lg:items-start lg:py-20">
          <div className="lg:pt-8">
            <p className="text-sm font-medium text-zinc-600">{dict.hero.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              {dict.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-600">{dict.hero.intro}</p>

            <ul className="mt-8 space-y-3 text-sm text-zinc-800">
              {dict.hero.points.map((point) => (
                <Point key={point}>{point}</Point>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#projects"
                className="rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                {dict.hero.browse}
              </a>
              <a
                href="#how-it-works"
                className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-950"
              >
                {dict.hero.howItWorks}
              </a>
            </div>
          </div>

          <RoiCalculator
            locale={locale}
            dict={{ calculator: dict.calculator, lead: dict.lead, units: dict.units }}
          />
        </div>
      </section>

      {/* How it works */}
      <Section id="how-it-works" title={dict.steps.title}>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {dict.steps.items.map((step, index) => (
            <li key={step.title} className="border-t-2 border-zinc-950 pt-4">
              <span className="text-sm font-medium text-zinc-500">{f.twoDigit(index + 1)}</span>
              <h3 className="mt-2 font-semibold text-zinc-950">{step.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Projects */}
      <Section
        id="projects"
        title={dict.projects.title}
        intro={dict.projects.intro}
        className="bg-zinc-50"
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} locale={locale} dict={dict} />
          ))}
        </div>
      </Section>

      {/* Methodology */}
      <Section id="methodology" title={dict.methodology.title}>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5 text-zinc-700">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 font-mono text-sm text-zinc-950">
              {dict.methodology.formula}
            </div>
            {[
              dict.methodology.noCompounding,
              { ...dict.methodology.types, body: fill(dict.methodology.types.body, rates) },
              dict.methodology.sums,
              dict.methodology.bank,
            ].map(({ lead, body }) => (
              <p key={lead}>
                <strong className="text-zinc-950">{lead}</strong> {body}
              </p>
            ))}
          </div>

          <figure className="self-start rounded-xl border border-zinc-200 bg-white p-5">
            <figcaption className="text-sm font-medium text-zinc-950">
              {fill(dict.methodology.exampleCaption, { amount: f.taka(EXAMPLE_AMOUNT) })}
            </figcaption>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 font-medium">{dict.methodology.month}</th>
                  <th className="pb-2 text-right font-medium">{dict.methodology.rate}</th>
                  <th className="pb-2 text-right font-medium">{dict.methodology.profit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 tabular-nums">
                {EXAMPLE_MONTHS.map(({ month, rateBps }) => (
                  <tr key={month}>
                    <td className="py-2 text-zinc-700">{f.month(month)}</td>
                    <td className="py-2 text-right text-zinc-700">{f.rate(rateBps)}</td>
                    <td className="py-2 text-right text-zinc-950">
                      {f.taka(monthlyProfit(EXAMPLE_AMOUNT, rateBps))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-950 font-semibold text-zinc-950">
                  <td className="pt-2" colSpan={2}>
                    {dict.methodology.total}
                  </td>
                  <td className="pt-2 text-right tabular-nums">{f.taka(exampleTotal)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-3 text-xs text-zinc-500">{dict.methodology.exampleNote}</p>
          </figure>
        </div>
      </Section>

      {/* Companies and testimonials, condensed */}
      <Section id="companies" title={dict.companies.title} className="bg-zinc-50">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-zinc-600">{dict.companies.intro}</p>
            <ul className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200">
              {companies.map((company) => (
                <li key={company.name} className="flex items-baseline justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold text-zinc-950">{company.name}</p>
                    <p className="text-sm text-zinc-600">{company.sector}</p>
                  </div>
                  <p className="shrink-0 text-sm text-zinc-500">
                    {fill(dict.companies.since, { year: f.plain(company.operatingSince) })}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {testimonials.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.name} className="rounded-xl border border-zinc-200 bg-white p-5">
                  <blockquote className="text-sm text-zinc-800">“{testimonial.quote}”</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-semibold text-zinc-950">{testimonial.name}</span>
                    <span className="block text-zinc-500">{testimonial.detail}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" title={dict.faq.title}>
        <div className="max-w-3xl divide-y divide-zinc-200 border-y border-zinc-200">
          {dict.faq.items.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-zinc-950 marker:hidden">
                {faq.question}
                <span className="text-xl leading-none text-zinc-500 group-open:rotate-45 transition-transform" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-zinc-600">{fill(faq.answer, faqValues)}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Disclaimer + closing CTA */}
      <section className="border-t border-zinc-200 bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {dict.disclaimer.heading}
            </h2>
            <p className="mt-3 text-sm text-zinc-300">{dict.disclaimer.body}</p>
            <p className="mt-3 text-sm">
              <a href="#methodology" className="underline underline-offset-2 hover:text-zinc-300">
                {dict.disclaimer.methodology}
              </a>
              <span className="mx-2 text-zinc-500">·</span>
              <Link
                href={localePath(locale, '/legal#risk')}
                className="underline underline-offset-2 hover:text-zinc-300"
              >
                {dict.disclaimer.risk}
              </Link>
              <span className="mx-2 text-zinc-500">·</span>
              <Link
                href={localePath(locale, '/legal#terms')}
                className="underline underline-offset-2 hover:text-zinc-300"
              >
                {dict.disclaimer.terms}
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href="#calculator"
              className="rounded-md border border-white px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-zinc-950"
            >
              {dict.nav.calculate}
            </a>
            <a
              href={REGISTER_URL}
              className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              {dict.nav.getStarted}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  id,
  title,
  intro,
  className = '',
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`scroll-mt-16 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h2>
        {intro && <p className="mt-2 text-zinc-600">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      {children}
    </li>
  );
}
