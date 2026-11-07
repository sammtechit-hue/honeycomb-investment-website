'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginInputSchema, type LoginInput } from '@investment-platform/contracts/auth';
import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from '@/lib/api-error';
import type { DemoLogin } from '@/lib/demo-logins';
import { localMobileSchema, withCountryCode } from '@/lib/phone';
import {
  FieldError,
  FormAlert,
  PasswordInput,
  inputClass,
  inputFrameClass,
  submitClass,
} from './auth-fields';
import { DemoLoginsPanel } from './demo-logins-panel';

// Shareholders sign in with their mobile number (/login); staff have no
// phone and sign in with email (/staff/login). Both post to the same
// endpoint — the API matches on email when the identifier contains '@'.
export type LoginVariant = 'shareholder' | 'staff';

const staffEmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(150, 'Email cannot exceed 150 characters')
  .email('Enter a valid email address');

const loginFormSchemas = {
  shareholder: z.object({ identifier: localMobileSchema, password: loginInputSchema.shape.password }),
  staff: z.object({ identifier: staffEmailSchema, password: loginInputSchema.shape.password }),
};

type LoginFormValues = { identifier: string; password: string };

type FormError = { message: string; badCredentials: boolean };

const COPY = {
  shareholder: {
    badCredentials: "That mobile number and password don't match. Check both and try again.",
    forgotHref: '/forgot-password',
  },
  staff: {
    badCredentials: "That email and password don't match. Check both and try again.",
    forgotHref: '/forgot-password?as=staff',
  },
} as const;

// `next` is already validated by safeNextPath on the server. `demoLogins`
// is only ever set in development (lib/demo-logins.ts).
export function LoginForm({
  variant,
  next,
  demoLogins,
}: {
  variant: LoginVariant;
  next: string;
  demoLogins?: DemoLogin[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<FormError | null>(null);
  const copy = COPY[variant];

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchemas[variant]),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async ({ identifier, password }: LoginFormValues) => {
    setFormError(null);
    const body: LoginInput = {
      identifier: variant === 'shareholder' ? withCountryCode(identifier) : identifier.trim(),
      password,
    };

    // Same-origin: next.config.ts rewrites /api/* to the Nest API, so the
    // httpOnly auth cookies it sets land on secure-web's own origin.
    let res: Response;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      setFormError({ message: NETWORK_ERROR, badCredentials: false });
      return;
    }

    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }

    const error = await readApiError(res);

    if (res.status === 401) {
      setFormError({ message: copy.badCredentials, badCredentials: true });
      resetField('password');
      setFocus('password');
    } else if (res.status === 429) {
      // Account lockout says how long to wait; the per-IP limiter doesn't.
      setFormError({ message: error.message ?? RATE_LIMIT_ERROR, badCredentials: false });
    } else if (res.status === 403) {
      // Deactivated account / staff network not permitted.
      setFormError({ message: error.message ?? 'Sign in is not available right now.', badCredentials: false });
    } else if (res.status === 400 && Object.keys(error.fieldErrors).length > 0) {
      if (error.fieldErrors.identifier) setError('identifier', { message: error.fieldErrors.identifier });
      if (error.fieldErrors.password) setError('password', { message: error.fieldErrors.password });
    } else {
      setFormError({ message: GENERIC_ERROR, badCredentials: false });
    }
  };

  const fillDemoLogin = (login: DemoLogin) => {
    setFormError(null);
    clearErrors();
    setValue('identifier', login.identifier);
    setValue('password', login.password);
    setFocus('password');
  };

  const passwordError = errors.password?.message
    ?? (formError?.badCredentials ? 'Please re-enter your password to match our records.' : undefined);

  return (
    <div className="flex flex-col gap-4">
      {demoLogins && demoLogins.length > 0 && (
        <DemoLoginsPanel logins={demoLogins} onUse={fillDemoLogin} />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {formError && (
          <FormAlert
            message={formError.message}
            detail={
              formError.badCredentials
                ? '5 consecutive failed attempts lock sign in for 15 minutes.'
                : undefined
            }
          />
        )}

        <div className="flex flex-col">
          <label htmlFor="identifier" className="flex gap-1 text-sm leading-5">
            {variant === 'shareholder' ? 'Mobile number' : 'Email address'}{' '}
            <span aria-hidden className="font-bold">*</span>
          </label>
          <div className={inputFrameClass(!!errors.identifier)}>
            {variant === 'shareholder' && (
              <span className="flex h-full items-center rounded-l-md bg-addon px-3 text-sm leading-5">
                +880
              </span>
            )}
            <input
              id="identifier"
              {...(variant === 'shareholder'
                ? ({ type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', placeholder: '1712 345678' } as const)
                : ({ type: 'email', inputMode: 'email', autoComplete: 'username', placeholder: 'name@company.com' } as const))}
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
              {variant === 'shareholder'
                ? 'The mobile number you registered with.'
                : 'The email address your staff account was created with.'}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <label htmlFor="password" className="flex gap-1 text-sm leading-5">
            Password <span aria-hidden className="font-bold">*</span>
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={variant === 'shareholder' ? 'Enter shareholder password' : 'Enter staff password'}
            invalid={!!passwordError}
            describedBy={passwordError ? 'password-error' : undefined}
            registration={register('password')}
          />
          {passwordError && <FieldError id="password-error" message={passwordError} />}
          <div className="flex justify-end pt-2">
            <Link
              href={copy.forgotHref}
              className="text-xs leading-4 underline decoration-rule underline-offset-2"
            >
              Forgot password
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={isSubmitting} className={submitClass}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
