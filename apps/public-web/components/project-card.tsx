import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { createFormat, fill } from '@/lib/i18n/format';
import { formatPeriods, type PublicProject } from '@/lib/projects';
import { FIXED_RATE_BPS, VARIABLE_RATE_MAX_BPS, VARIABLE_RATE_MIN_BPS } from '@/lib/roi';
import { REGISTER_URL } from '@/lib/site';
import { CalculateProjectButton } from './calculate-project-button';

export function ProjectCard({
  project,
  locale,
  dict,
}: {
  project: PublicProject;
  locale: Locale;
  dict: Dictionary;
}) {
  const f = createFormat(locale, dict.units);
  const t = dict.projectCard;
  const isOpen = project.status === 'OPEN';
  const typeLabel =
    project.investmentType === 'fixed'
      ? fill(t.fixed, { rate: f.rate(FIXED_RATE_BPS) })
      : fill(t.variable, {
          minRate: f.rate(VARIABLE_RATE_MIN_BPS),
          maxRate: f.rate(VARIABLE_RATE_MAX_BPS),
        });

  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {project.company}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-zinc-950">{project.name}</h3>
        </div>
        <span
          className={
            isOpen
              ? 'shrink-0 rounded-full bg-zinc-950 px-2.5 py-0.5 text-xs font-medium text-white'
              : 'shrink-0 rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs font-medium text-zinc-600'
          }
        >
          {t.status[project.status]}
        </span>
      </div>

      <dl className="mt-4 divide-y divide-zinc-100 text-sm">
        <Fact label={t.minimum} value={f.taka(project.minimumInvestment)} />
        <Fact label={t.type} value={typeLabel} />
        <Fact label={t.frequency} value={formatPeriods(project.payoutFrequencies, dict.periods)} />
        <Fact label={t.term} value={f.term(project.termMonths)} />
      </dl>

      <div className="mt-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.useOfFunds}</h4>
        <p className="mt-1 text-sm text-zinc-700">{project.useOfFunds}</p>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.documents}</h4>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {project.documents.map((document) => (
            <li
              key={document}
              className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700"
            >
              {document}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-zinc-500">{t.documentsNote}</p>
      </div>

      <div className="mt-auto flex gap-2 pt-5">
        <CalculateProjectButton project={project} label={t.calculate} />
        {isOpen && (
          <a
            href={REGISTER_URL}
            className="flex-1 rounded-md bg-zinc-950 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            {t.getStarted}
          </a>
        )}
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="text-right font-medium text-zinc-950">{value}</dd>
    </div>
  );
}
