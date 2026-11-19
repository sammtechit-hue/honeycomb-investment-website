import Link from 'next/link';
import type { ReactNode } from 'react';

// Form building blocks for the dashboard's action pages (invest, submit
// payment, request changes, security). Inputs, labels and errors reuse the
// verification wizard's pieces so every form in the app looks the same.
export { Alert, Field, FieldError, describedBy, inputClass } from '@/app/verification/ui';

export function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full max-w-[640px] flex-col gap-6 rounded-lg border border-hairline bg-white p-5 drop-shadow-[0px_4px_12px_rgba(0,0,0,0.03)] sm:p-8">
      <header className="flex flex-col gap-1 border-b border-hairline pb-5">
        <h2 className="text-base leading-6 font-semibold text-ink">{title}</h2>
        {description && <div className="text-sm leading-5 text-muted">{description}</div>}
      </header>
      {children}
    </section>
  );
}

export function FormActions({
  busy,
  label,
  busyLabel = 'Submitting…',
  cancelHref,
}: {
  busy: boolean;
  label: string;
  busyLabel?: string;
  cancelHref?: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-end">
      {cancelHref && (
        <Link
          href={cancelHref}
          className="flex h-10 items-center justify-center rounded-md border border-emphasis px-6 text-sm leading-5 text-ink hover:bg-surface"
        >
          Cancel
        </Link>
      )}
      <button type="submit" disabled={busy} className={primaryButtonClass}>
        {busy ? busyLabel : label}
      </button>
    </div>
  );
}

export const primaryButtonClass =
  'flex h-10 items-center justify-center rounded-md bg-black px-6 text-sm leading-5 text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-black/85 disabled:opacity-60';

export const secondaryButtonClass =
  'flex h-10 items-center justify-center rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface disabled:opacity-60';

// Small inline action inside a table row.
export const rowActionClass =
  'text-sm leading-5 whitespace-nowrap text-ink underline decoration-rule underline-offset-2 hover:decoration-black';

export function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-hairline bg-chip p-[5px]" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-md py-2 text-sm leading-5 ${
              checked ? 'bg-black text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]' : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
