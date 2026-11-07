'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  newPasswordSchema,
  resetPasswordInputSchema,
  type ResetPasswordInput,
} from '@investment-platform/contracts/auth';
import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from '@/lib/api-error';
import { FieldError, FormAlert, PasswordInput, submitClass } from './auth-fields';

// Completes both emailed links, which share POST /api/auth/reset-password:
//   reset  — /reset-password#token=…  (forgot password, 30 min)
//   invite — /set-password#token=…    (new staff account, 72 h)
// The token is in the #fragment, which the browser never sends to a server.
export type SetPasswordPurpose = 'reset' | 'invite';

const formSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

// The fragment isn't available during server rendering: undefined there,
// the real value once hydrated.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const readHash = () => window.location.hash;
const noHashOnServer = () => undefined;

function tokenFrom(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  return token && resetPasswordInputSchema.shape.token.safeParse(token).success ? token : null;
}

export function SetPasswordForm({ purpose }: { purpose: SetPasswordPurpose }) {
  const hash = useSyncExternalStore(subscribeToHash, readHash, noHashOnServer);
  const [state, setState] = useState<'form' | 'done' | 'link-dead'>('form');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (hash === undefined) {
    return <p className="text-sm leading-5 text-muted">Loading…</p>;
  }

  const token = tokenFrom(hash);

  if (state === 'done') {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-sm leading-5">
          {purpose === 'invite'
            ? 'Your password is set. You can now sign in to your staff account.'
            : 'Your password has been changed and you have been signed out everywhere. Sign in with your new password.'}
        </p>
        <Link href={purpose === 'invite' ? '/staff/login' : '/login'} className={submitClass}>
          Sign in
        </Link>
        {purpose === 'reset' && (
          <Link
            href="/staff/login"
            className="text-center text-xs leading-4 text-muted underline decoration-rule underline-offset-2"
          >
            Staff sign in
          </Link>
        )}
      </div>
    );
  }

  if (!token || state === 'link-dead') {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert
          message={
            token
              ? 'This link is invalid, expired or has already been used.'
              : 'This link is incomplete. Open it straight from the email, or copy the whole address.'
          }
        />
        {purpose === 'invite' ? (
          <p className="text-sm leading-5 text-muted">
            Invite links expire after 72 hours. Ask your super admin to resend the invite.
          </p>
        ) : (
          <Link href="/forgot-password" className={submitClass}>
            Request a new link
          </Link>
        )}
      </div>
    );
  }

  const onSubmit = async ({ newPassword }: FormValues) => {
    setFormError(null);
    const body: ResetPasswordInput = { token, newPassword };

    let res: Response;
    try {
      res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      setFormError(NETWORK_ERROR);
      return;
    }

    if (res.ok) {
      setState('done');
      return;
    }

    const error = await readApiError(res);
    if (res.status === 400 && error.fieldErrors.newPassword) {
      setError('newPassword', { message: error.fieldErrors.newPassword });
    } else if (res.status === 400) {
      // Unknown, used or expired token (or a malformed one).
      setState('link-dead');
    } else {
      setFormError(res.status === 429 ? RATE_LIMIT_ERROR : GENERIC_ERROR);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && <FormAlert message={formError} />}

      <div className="flex flex-col">
        <label htmlFor="newPassword" className="flex gap-1 text-sm leading-5">
          New password <span aria-hidden className="font-bold">*</span>
        </label>
        <PasswordInput
          id="newPassword"
          autoComplete="new-password"
          invalid={!!errors.newPassword}
          describedBy={errors.newPassword ? 'newPassword-error' : 'newPassword-hint'}
          registration={register('newPassword')}
        />
        {errors.newPassword ? (
          <FieldError id="newPassword-error" message={errors.newPassword.message} />
        ) : (
          <p id="newPassword-hint" className="pt-1.5 text-xs leading-4 text-muted">
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="confirmPassword" className="flex gap-1 text-sm leading-5">
          Confirm password <span aria-hidden className="font-bold">*</span>
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          invalid={!!errors.confirmPassword}
          describedBy={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          registration={register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <FieldError id="confirmPassword-error" message={errors.confirmPassword.message} />
        )}
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? 'Saving…' : purpose === 'invite' ? 'Set password' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
