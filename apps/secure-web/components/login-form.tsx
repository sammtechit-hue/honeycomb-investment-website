'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginInputSchema, type LoginInput } from '@investment-platform/contracts/auth';
import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from '@/lib/api-error';
import { localMobileSchema, withCountryCode } from '@/lib/phone';

const loginFormSchema = z.object({
  phone: localMobileSchema,
  password: loginInputSchema.shape.password,
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

type FormError = { message: string; badCredentials: boolean };

// `next` is already validated by safeNextPath on the server.
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = async ({ phone, password }: LoginFormValues) => {
    setFormError(null);
    const body: LoginInput = { identifier: withCountryCode(phone), password };

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
      setFormError({
        message: "That mobile number and password don't match. Check both and try again.",
        badCredentials: true,
      });
      resetField('password');
      setFocus('password');
    } else if (res.status === 429) {
      // Account lockout says how long to wait; the per-IP limiter doesn't.
      setFormError({ message: error.message ?? RATE_LIMIT_ERROR, badCredentials: false });
    } else if (res.status === 403) {
      // Deactivated account / network not permitted.
      setFormError({ message: error.message ?? 'Sign in is not available right now.', badCredentials: false });
    } else if (res.status === 400) {
      if (error.fieldErrors.identifier) setError('phone', { message: error.fieldErrors.identifier });
      if (error.fieldErrors.password) setError('password', { message: error.fieldErrors.password });
    } else {
      setFormError({ message: GENERIC_ERROR, badCredentials: false });
    }
  };

  const passwordError = errors.password?.message
    ?? (formError?.badCredentials ? 'Please re-enter your password to match our records.' : undefined);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[2px] bg-surface-strong p-3 shadow-[0px_0px_0px_2px_var(--color-emphasis)]"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-black">
            <Image src="/auth/error-x.svg" alt="" width={9.1} height={9.1} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[13px] leading-[18px]">{formError.message}</p>
            {formError.badCredentials && (
              <p className="text-[11px] leading-[14px] text-muted">
                5 consecutive failed attempts lock sign in for 15 minutes.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <label htmlFor="phone" className="flex gap-1 text-sm leading-5">
          Mobile number <span aria-hidden className="font-bold">*</span>
        </label>
        <div
          className={`flex h-10 items-center rounded-md bg-white focus-within:shadow-[0px_0px_0px_2px_var(--color-emphasis)] ${
            errors.phone ? 'shadow-[0px_0px_0px_2px_var(--color-emphasis)]' : ''
          }`}
        >
          <span className="flex h-full items-center rounded-l-md bg-addon px-3 text-sm leading-5">
            +880
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="1712 345678"
            aria-required
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
            {...register('phone')}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-placeholder"
          />
        </div>
        {errors.phone ? (
          <FieldError id="phone-error" message={errors.phone.message} />
        ) : (
          <p id="phone-hint" className="pt-1.5 text-xs leading-4 text-muted">
            We use SMS for verification and monthly payout notifications.
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="password" className="flex gap-1 text-sm leading-5">
          Password <span aria-hidden className="font-bold">*</span>
        </label>
        <div
          className={`relative flex h-10 items-center rounded-md bg-white focus-within:shadow-[0px_0px_0px_2px_var(--color-emphasis)] ${
            passwordError ? 'shadow-[0px_0px_0px_2px_var(--color-emphasis)]' : ''
          }`}
        >
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter shareholder password"
            aria-required
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? 'password-error' : undefined}
            {...register('password')}
            className="h-full min-w-0 flex-1 bg-transparent pr-16 pl-3 text-sm outline-none placeholder:text-placeholder"
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-pressed={showPassword}
            aria-controls="password"
            className="absolute right-2 px-2 py-1 text-xs leading-4 text-muted hover:text-black"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {passwordError && <FieldError id="password-error" message={passwordError} />}
        <div className="flex justify-end pt-2">
          <Link
            href="/forgot-password"
            className="text-xs leading-4 underline decoration-rule underline-offset-2"
          >
            Forgot password
          </Link>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center rounded-md bg-black text-sm leading-5 font-bold text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-black/85 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="flex items-center gap-1 pt-1.5 text-xs leading-5">
      <Image src="/auth/field-error.svg" alt="" width={11.6667} height={11.6667} />
      {message}
    </p>
  );
}
