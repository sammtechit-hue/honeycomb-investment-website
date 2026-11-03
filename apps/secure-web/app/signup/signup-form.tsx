'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signupInputSchema, type SignupInput } from '@investment-platform/contracts/auth';
import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from '@/lib/api-error';
import { localMobileSchema, withCountryCode } from '@/lib/phone';

const signupFormSchema = z
  .object({
    phone: localMobileSchema,
    email: signupInputSchema.shape.email,
    password: signupInputSchema.shape.password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.input<typeof signupFormSchema>;

const inputClass =
  'h-10 w-full rounded-md border border-hairline bg-white px-[13px] text-sm outline-none placeholder:text-placeholder focus:border-black aria-invalid:border-black aria-invalid:shadow-[0px_0px_0px_1px_var(--color-emphasis)]';

export function SignupForm({ termsUrl }: { termsUrl: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { phone: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null);
    const body: SignupInput = {
      email: values.email,
      phoneNumber: withCountryCode(values.phone),
      password: values.password,
    };

    // Same-origin: next.config.ts rewrites /api/* to the Nest API, so the
    // session cookies signup sets land on secure-web's own origin.
    let res: Response;
    try {
      res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      setFormError(NETWORK_ERROR);
      return;
    }

    if (res.ok) {
      router.replace('/signup/complete');
      return;
    }

    const error = await readApiError(res);

    if (res.status === 409 && error.message) {
      // See signupConflictMessage in apps/api/src/auth/auth.service.ts.
      const lower = error.message.toLowerCase();
      if (lower.includes('email')) setError('email', { message: error.message });
      if (lower.includes('phone')) setError('phone', { message: error.message });
      if (!lower.includes('email') && !lower.includes('phone')) setFormError(error.message);
      return;
    }

    if (res.status === 400 && Object.keys(error.fieldErrors).length > 0) {
      // API field name → form field name.
      const fields = { phoneNumber: 'phone', email: 'email', password: 'password' } as const;
      for (const [apiField, formField] of Object.entries(fields)) {
        const message = error.fieldErrors[apiField];
        if (message) setError(formField, { message });
      }
      return;
    }

    setFormError(res.status === 429 ? RATE_LIMIT_ERROR : GENERIC_ERROR);
  };

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
          <p className="text-[13px] leading-[18px]">{formError}</p>
        </div>
      )}

      <Field id="phone" label="Mobile number" error={errors.phone?.message}>
        <div className="flex h-10 overflow-hidden rounded-md border border-hairline bg-white focus-within:border-black has-aria-invalid:border-black has-aria-invalid:shadow-[0px_0px_0px_1px_var(--color-emphasis)]">
          <span className="flex items-center border-r border-hairline bg-surface-strong pr-[13px] pl-3 text-xs leading-4 tracking-[-0.3px] text-ink">
            +880
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="1712 345678"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            {...register('phone')}
            className="min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-placeholder"
          />
        </div>
      </Field>

      <Field
        id="email"
        label="Email address"
        hint="Used for payout confirmations and your disbursement records"
        error={errors.email?.message}
      >
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : 'email-hint'}
          {...register('email')}
          className={inputClass}
        />
      </Field>

      <Field
        id="password"
        label="Password"
        hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number"
        error={errors.password?.message}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          invalid={!!errors.password}
          describedBy={errors.password ? 'password-error' : 'password-hint'}
          registration={register('password')}
        />
      </Field>

      <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          invalid={!!errors.confirmPassword}
          describedBy={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          registration={register('confirmPassword')}
        />
      </Field>

      <div className="flex flex-col gap-1.5 pt-1">
        <label className="flex items-start gap-3 text-xs leading-[16.5px] text-secondary">
          <span className="relative mt-0.5 flex size-4 shrink-0">
            <input
              type="checkbox"
              aria-invalid={!!errors.acceptTerms}
              aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
              {...register('acceptTerms')}
              className="peer size-4 cursor-pointer appearance-none rounded-[3px] border border-rule bg-white checked:border-emphasis checked:bg-emphasis focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black aria-invalid:border-black"
            />
            <Image
              src="/auth/checkbox-check.svg"
              alt=""
              width={9.5}
              height={7}
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100"
            />
          </span>
          <span>
            I agree to the{' '}
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-black underline decoration-rule underline-offset-2">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-black underline decoration-rule underline-offset-2">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptTerms && <FieldError id="acceptTerms-error" message={errors.acceptTerms.message} />}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center rounded-md bg-emphasis text-sm leading-5 tracking-[0.35px] text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-black/85 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs leading-4">
        {label} <span aria-hidden>*</span>
      </label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`} message={error} />
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs leading-[15px] text-secondary">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function PasswordInput({
  id,
  autoComplete,
  invalid,
  describedBy,
  registration,
}: {
  id: string;
  autoComplete: string;
  invalid: boolean;
  describedBy?: string;
  registration: UseFormRegisterReturn;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
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
        className="absolute right-2 px-2 py-1 text-xs leading-5 tracking-[0.6px] text-secondary uppercase hover:text-black"
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="flex items-center gap-1 text-xs leading-5">
      <Image src="/auth/field-error.svg" alt="" width={11.6667} height={11.6667} />
      {message}
    </p>
  );
}
