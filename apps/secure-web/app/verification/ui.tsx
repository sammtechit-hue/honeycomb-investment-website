import Image from 'next/image';
import type { ReactNode } from 'react';

// Building blocks shared by the four verification steps (Figma: "Project
// Shareholder Verification – Bank Details / Documents").

export const inputClass =
  'h-10 w-full rounded-md border border-hairline bg-canvas px-[13px] text-sm text-ink outline-none placeholder:text-placeholder focus:border-black aria-invalid:border-2 aria-invalid:border-emphasis aria-invalid:px-3';

export function StepCard({
  eyebrow,
  title,
  description,
  badge,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full max-w-[640px] flex-col gap-8 rounded-lg border border-hairline bg-white p-5 drop-shadow-[0px_4px_12px_rgba(0,0,0,0.03)] sm:p-8">
      <header className="flex flex-col gap-2 border-b border-hairline pb-6">
        {eyebrow && (
          <p className="text-xs leading-4 tracking-[1.2px] text-muted uppercase">{eyebrow}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink">
            {title}
          </h1>
          {badge}
        </div>
        <p className="text-sm leading-5 text-muted">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  meta,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  meta?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm leading-5 text-ink">
          {label}{' '}
          {optional ? <span className="text-muted">(optional)</span> : <span aria-hidden>*</span>}
        </label>
        {meta && <span className="text-xs leading-4 text-muted">{meta}</span>}
      </div>
      {children}
      {error ? (
        <FieldError id={`${id}-error`} message={error} />
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs leading-4 text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  return (
    <p id={id} className="flex items-start gap-1 text-xs leading-4 text-ink">
      <Image src="/auth/field-error.svg" alt="" width={11.6667} height={11.6667} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[2px] bg-surface-strong p-3 text-[13px] leading-[18px] text-black shadow-[0px_0px_0px_2px_var(--color-emphasis)]"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-black">
        <Image src="/auth/error-x.svg" alt="" width={9.1} height={9.1} />
      </span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function StepFooter({
  step,
  onBack,
  primaryLabel,
  primaryIcon,
  busy,
  busyLabel,
}: {
  step: number;
  onBack?: () => void;
  primaryLabel: string;
  primaryIcon?: boolean;
  busy?: boolean;
  busyLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline pt-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="flex h-10 items-center gap-2 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface disabled:opacity-50 sm:px-6"
        >
          <Image src="/verify/arrow-left.svg" alt="" width={10.6667} height={10.6667} />
          Back
        </button>
      ) : (
        <span />
      )}
      <p className="hidden text-xs leading-4 tracking-[0.3px] text-muted uppercase sm:block">
        Step {step} of 4
      </p>
      <button
        type="submit"
        disabled={busy}
        className="flex h-10 items-center gap-2 rounded-md bg-black px-5 text-sm leading-5 text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-black/85 disabled:opacity-60 sm:px-8"
      >
        {busy ? (busyLabel ?? 'Saving…') : primaryLabel}
        {primaryIcon && !busy && (
          <Image src="/verify/arrow-right-white.svg" alt="" width={10.6667} height={10.6667} />
        )}
      </button>
    </div>
  );
}

export const STEPS = ['Personal info', 'Nominee', 'Bank details', 'Documents'] as const;

export function Stepper({
  current,
  completed,
  onSelect,
}: {
  current: number;
  completed: boolean[];
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Verification progress" className="w-full max-w-[760px]">
      <ol className="relative flex items-start justify-between">
        <span aria-hidden className="absolute top-4 right-[12%] left-[12%] h-px bg-hairline" />
        {STEPS.map((label, index) => {
          const step = index + 1;
          const isCurrent = step === current;
          const isDone = completed[index] && !isCurrent;
          const reachable = step <= current || completed.slice(0, index).every(Boolean);

          return (
            <li key={label} className="relative flex flex-1 flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(step)}
                disabled={!reachable || isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${step}: ${label}${isDone ? ' (complete)' : ''}`}
                className={`relative flex size-8 items-center justify-center rounded-xl text-sm leading-[14px] ${
                  isDone || isCurrent
                    ? 'bg-black font-bold text-white'
                    : 'border border-rule bg-canvas text-muted opacity-70'
                } ${isCurrent ? 'shadow-[0px_0px_0px_4px_var(--color-canvas)]' : ''} ${
                  reachable && !isCurrent ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {isDone ? (
                  <Image src="/verify/step-check.svg" alt="" width={10.8667} height={8.01667} />
                ) : (
                  step
                )}
              </button>
              <span
                className={`text-center text-[11px] leading-4 sm:text-xs ${
                  isCurrent ? 'font-bold text-ink' : 'text-muted'
                }`}
              >
                <span className="hidden sm:inline">{step}. </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
