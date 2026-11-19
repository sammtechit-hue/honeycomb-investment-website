import type { ReactNode } from 'react';

// Building blocks for the investor dashboard (Figma: "Investor
// Dashboard – Profit History" and its empty state).

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {eyebrow && <p className="text-xs leading-4 tracking-[1.2px] text-muted uppercase">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.6px] text-ink">{title}</h1>
        {description && <p className="max-w-[640px] text-sm leading-5 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-hairline bg-white drop-shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div className="flex flex-col gap-0.5">
            {title && <h2 className="text-base leading-6 font-semibold text-ink">{title}</h2>}
            {description && <p className="text-xs leading-4 text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-white p-5 drop-shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
      <p className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{label}</p>
      <p className="text-2xl leading-8 font-bold tracking-[-0.6px] text-ink tabular-nums">{value}</p>
      {hint && <p className="text-xs leading-4 text-muted">{hint}</p>}
    </div>
  );
}

const BADGE_TONES = {
  solid: 'bg-emphasis text-white',
  muted: 'bg-surface-strong text-secondary',
  outline: 'border border-rule text-secondary',
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'muted', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-[2px] px-2 text-xs leading-4 whitespace-nowrap ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-base leading-6 font-semibold text-ink">{title}</p>
      <p className="max-w-[420px] text-sm leading-5 text-muted">{body}</p>
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-hairline border-l-4 border-l-emphasis bg-surface px-5 py-4">
      <p className="text-sm leading-5 font-semibold text-ink">{title}</p>
      <div className="text-sm leading-5 text-secondary">{children}</div>
    </div>
  );
}

// Horizontal scroll on small screens instead of squashing columns.
export function Table({ head, children, minWidth = 720 }: { head: ReactNode; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm leading-5" style={{ minWidth }}>
        <thead className="border-b border-hairline bg-surface text-xs leading-4 tracking-[0.6px] text-muted uppercase">
          {head}
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

export const th = 'px-5 py-3 font-normal whitespace-nowrap';
export const td = 'px-5 py-3.5 align-top text-ink';
export const tdNum = `${td} text-right tabular-nums whitespace-nowrap`;
export const thNum = `${th} text-right`;

export const footnote =
  'Profit is calculated on your invested amount each month and is never compounded. Each month’s rate is stored on record and the months are added up at payout — no averaged rate is applied.';
