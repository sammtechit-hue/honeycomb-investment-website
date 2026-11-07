'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { UseFormRegisterReturn } from 'react-hook-form';

// Form pieces shared by the AuthShell pages (sign in, forgot / reset password).

export const inputFrameClass = (invalid: boolean) =>
  `flex h-10 items-center rounded-md bg-white focus-within:shadow-[0px_0px_0px_2px_var(--color-emphasis)] ${
    invalid ? 'shadow-[0px_0px_0px_2px_var(--color-emphasis)]' : ''
  }`;

export const inputClass =
  'h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-placeholder';

export const submitClass =
  'flex h-10 w-full items-center justify-center rounded-md bg-black text-sm leading-5 font-bold text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-black/85 disabled:opacity-60';

export function FormAlert({ message, detail }: { message: string; detail?: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[2px] bg-surface-strong p-3 shadow-[0px_0px_0px_2px_var(--color-emphasis)]"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-black">
        <Image src="/auth/error-x.svg" alt="" width={9.1} height={9.1} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-[13px] leading-[18px]">{message}</p>
        {detail && <p className="text-[11px] leading-[14px] text-muted">{detail}</p>}
      </div>
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="flex items-center gap-1 pt-1.5 text-xs leading-5">
      <Image src="/auth/field-error.svg" alt="" width={11.6667} height={11.6667} />
      {message}
    </p>
  );
}

export function PasswordInput({
  id,
  autoComplete,
  placeholder,
  invalid,
  describedBy,
  registration,
}: {
  id: string;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  invalid: boolean;
  describedBy?: string;
  registration: UseFormRegisterReturn;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className={`relative ${inputFrameClass(invalid)}`}>
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-required
        aria-invalid={invalid}
        aria-describedby={describedBy}
        {...registration}
        className={`${inputClass} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-pressed={shown}
        aria-controls={id}
        className="absolute right-2 px-2 py-1 text-xs leading-4 text-muted hover:text-black"
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
