'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ForgotPasswordInput } from '@investment-platform/contracts/auth';
import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from '@/lib/api-error';
import { localMobileSchema, withCountryCode } from '@/lib/phone';
import { FieldError, FormAlert, inputClass, inputFrameClass, submitClass } from './auth-fields';

type Method = 'phone' | 'email';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(150, 'Email cannot exceed 150 characters')
  .email('Enter a valid email address');

const schemas = {
  phone: z.object({ identifier: localMobileSchema }),
  email: z.object({ identifier: emailSchema }),
};

// The reset link always goes to the account's EMAIL (there is no SMS). The
// API answers the same whether or not an account matched, so this page can't
// be used to find out who is registered — and neither does it say so.
export function ForgotPasswordForm({
  initialMethod,
  signInHref,
}: {
  initialMethod: Method;
  signInHref: string;
}) {
  const [method, setMethod] = useState<Method>(initialMethod);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ identifier: string }>({
    resolver: zodResolver(schemas[method]),
    defaultValues: { identifier: '' },
  });

  const switchMethod = () => {
    setMethod((current) => (current === 'phone' ? 'email' : 'phone'));
    setFormError(null);
    reset({ identifier: '' });
  };

  const onSubmit = async ({ identifier }: { identifier: string }) => {
    setFormError(null);
    const body: ForgotPasswordInput = {
      identifier: method === 'phone' ? withCountryCode(identifier) : identifier.trim(),
    };

    let res: Response;
    try {
      res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      setFormError(NETWORK_ERROR);
      return;
    }

    if (res.ok) {
      setSent(true);
      return;
    }

    const error = await readApiError(res);
    if (res.status === 400 && error.fieldErrors.identifier) {
      setError('identifier', { message: error.fieldErrors.identifier });
    } else {
      setFormError(res.status === 429 ? RATE_LIMIT_ERROR : GENERIC_ERROR);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-sm leading-5">
          If an account matches that {method === 'phone' ? 'mobile number' : 'email address'}, we
          have sent a password reset link to the email address on the account.
        </p>
        {/* 30 = PASSWORD_RESET_TTL_MINUTES in apps/api/src/auth/password-tokens.service.ts */}
        <p className="text-xs leading-4 text-muted">
          The link works once and expires after 30 minutes. Nothing arrived? Check your spam
          folder, or contact HoneyComb support.
        </p>
        <Link href={signInHref} className={submitClass}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && <FormAlert message={formError} />}

      <div className="flex flex-col">
        <label htmlFor="identifier" className="flex gap-1 text-sm leading-5">
          {method === 'phone' ? 'Mobile number' : 'Email address'}{' '}
          <span aria-hidden className="font-bold">*</span>
        </label>
        <div className={inputFrameClass(!!errors.identifier)}>
          {method === 'phone' && (
            <span className="flex h-full items-center rounded-l-md bg-addon px-3 text-sm leading-5">
              +880
            </span>
          )}
          <input
            key={method}
            id="identifier"
            {...(method === 'phone'
              ? ({ type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', placeholder: '1712 345678' } as const)
              : ({ type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'name@example.com' } as const))}
            aria-required
            aria-invalid={!!errors.identifier}
            aria-describedby={errors.identifier ? 'identifier-error' : 'identifier-hint'}
            {...register('identifier')}
            className={inputClass}
          />
        </div>
        {errors.identifier ? (
          <FieldError id="identifier-error" message={errors.identifier.message} />
        ) : (
          <p id="identifier-hint" className="pt-1.5 text-xs leading-4 text-muted">
            We&apos;ll email a reset link to the address on your account.
          </p>
        )}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={switchMethod}
            className="text-xs leading-4 underline decoration-rule underline-offset-2"
          >
            {method === 'phone' ? 'Use email address instead' : 'Use mobile number instead'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
        <Link
          href={signInHref}
          className="text-center text-sm leading-5 text-muted underline decoration-rule underline-offset-2"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
