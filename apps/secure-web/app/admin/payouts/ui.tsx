import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PayoutWindow } from '@/lib/payouts';

// Pieces shared by the payout screens.

export const PAYOUTS_PATH = '/admin/payouts';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function pageParam(v: string | string[] | undefined) {
  const n = Number(one(v));
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

// "November 2026" from the stored labels (NOVEMBER, 2026).
export function windowName(w: Pick<PayoutWindow, 'monthLabel' | 'yearLabel'>) {
  return `${w.monthLabel.charAt(0)}${w.monthLabel.slice(1).toLowerCase()} ${w.yearLabel}`;
}

export function PayoutTabs({ current }: { current: 'windows' | 'batches' | 'items' }) {
  const tabs = [
    { key: 'windows', href: PAYOUTS_PATH, label: 'Payout windows' },
    { key: 'batches', href: `${PAYOUTS_PATH}/batches`, label: 'Batches' },
    { key: 'items', href: `${PAYOUTS_PATH}/items`, label: 'Payout items' },
  ] as const;
  return (
    <nav aria-label="Payouts" className="flex gap-6 border-b border-hairline">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? 'page' : undefined}
          className={`-mb-px border-b-2 pb-3 text-sm leading-5 ${
            current === t.key ? 'border-black font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-3">
      {items.map(([term, value]) => (
        <div key={term} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{term}</dt>
          <dd className="text-sm leading-5 break-words text-ink">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export const linkClass = 'font-semibold underline decoration-rule underline-offset-2 hover:decoration-black';

// Simple previous/next for lists whose URL carries filters other than q/status.
export function SimplePagination({
  hrefFor,
  page,
  totalPages,
  total,
  noun,
}: {
  hrefFor: (page: number) => string;
  page: number;
  totalPages: number;
  total: number;
  noun: [string, string];
}) {
  if (total === 0) return null;
  const link = 'text-sm leading-5 text-ink underline decoration-rule underline-offset-2 hover:decoration-black';
  const pastEnd = page > totalPages;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4 border-t border-hairline px-5 py-3">
      <p className="text-xs leading-4 text-muted">
        {total} {total === 1 ? noun[0] : noun[1]}
        {pastEnd ? ` · ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}` : ` · page ${page} of ${totalPages}`}
      </p>
      <div className="flex gap-4">
        {page > 1 && (
          <Link href={hrefFor(pastEnd ? totalPages : page - 1)} className={link}>
            {pastEnd ? 'Last page' : 'Previous'}
          </Link>
        )}
        {page < totalPages && (
          <Link href={hrefFor(page + 1)} className={link}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
