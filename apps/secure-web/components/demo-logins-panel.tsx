'use client';

import type { DemoLogin } from '@/lib/demo-logins';

// Development-only list of the seeded demo accounts (see lib/demo-logins.ts).
// "Use" fills the form; the user still presses Sign in.
export function DemoLoginsPanel({
  logins,
  onUse,
}: {
  logins: DemoLogin[];
  onUse: (login: DemoLogin) => void;
}) {
  return (
    <section
      aria-label="Demo accounts"
      className="flex flex-col gap-2 rounded-md border border-dashed border-rule bg-white p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] leading-4 font-bold tracking-[0.6px] uppercase">
          Development only · demo accounts
        </p>
        <p className="text-[11px] leading-4 text-muted">
          Password for all: <code className="font-mono text-black">{logins[0]?.password}</code>.
          Not there? Run <code className="font-mono text-black">pnpm --filter api seed:demo</code>.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-hairline">
        {logins.map((login) => (
          <li key={login.identifier} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-xs leading-4">{login.identifier}</span>
              <span className="truncate text-[11px] leading-4 text-muted">{login.description}</span>
            </span>
            <button
              type="button"
              onClick={() => onUse(login)}
              className="shrink-0 rounded-[2px] bg-surface-strong px-2.5 py-1 text-xs leading-4 hover:bg-hairline"
            >
              Use
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
