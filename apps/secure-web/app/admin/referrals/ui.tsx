import Link from 'next/link';

export const REFERRALS_PATH = '/admin/referrals';

export function ReferralTabs({ current }: { current: 'referrals' | 'codes' }) {
  const tabs = [
    { key: 'referrals', href: REFERRALS_PATH, label: 'Referrals and bonuses' },
    { key: 'codes', href: `${REFERRALS_PATH}/codes`, label: 'Referral codes' },
  ] as const;
  return (
    <nav aria-label="Referrals" className="flex gap-6 border-b border-hairline">
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
