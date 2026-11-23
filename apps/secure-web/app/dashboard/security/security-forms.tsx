'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { newPasswordSchema } from '@investment-platform/contracts/auth';
import { Alert, Field, FormActions, describedBy, inputClass, secondaryButtonClass } from '@/components/dashboard/form';
import { NETWORK_ERROR } from '@/lib/api-error';
import { submitJson } from '@/lib/submit';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Re-enter the new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords don’t match',
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });
type Values = z.infer<typeof schema>;

const EMPTY: Values = { currentPassword: '', newPassword: '', confirmPassword: '' };

// The API signs out every other device on success and gives this browser a
// fresh session, so the investor stays signed in here.
export function ChangePasswordForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  async function onSubmit(values: Values) {
    setSubmitError(null);
    setDone(false);
    const result = await submitJson('/api/auth/change-password', {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (result.ok) {
      reset(EMPTY);
      setDone(true);
      return;
    }
    if (result.message === 'Current password is incorrect') {
      setError('currentPassword', { message: result.message });
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field in values) setError(field as keyof Values, { message });
    }
    setSubmitError(result.message);
  }

  const password = (id: keyof Values, label: string, autoComplete: string, hint?: string) => (
    <Field id={id} label={label} hint={hint} error={errors[id]?.message}>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={!!errors[id]}
        aria-describedby={describedBy(id, errors[id]?.message, hint)}
        {...register(id)}
        className={inputClass}
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}
      {done && (
        <p role="status" className="rounded-md border border-hairline bg-surface p-4 text-sm leading-5 text-ink">
          Password changed. You’ve been signed out on your other devices.
        </p>
      )}
      {password('currentPassword', 'Current password', 'current-password')}
      {password(
        'newPassword',
        'New password',
        'new-password',
        'At least 8 characters, with upper and lower case letters and a number.',
      )}
      {password('confirmPassword', 'Confirm new password', 'new-password')}
      <FormActions busy={isSubmitting} label="Change password" busyLabel="Saving…" />
    </form>
  );
}

export function SignOutEverywhere() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOutAll() {
    setPending(true);
    setError(null);
    const result = await submitJson('/api/auth/logout-all', {});
    if (!result.ok) {
      setPending(false);
      setError(result.message === NETWORK_ERROR ? result.message : 'Could not sign you out. Please try again.');
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert>
          <p>{error}</p>
        </Alert>
      )}
      {confirming ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm leading-5 text-ink">This signs you out here too. Continue?</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={signOutAll}
              disabled={pending}
              className="flex h-10 items-center justify-center rounded-md bg-black px-4 text-sm leading-5 text-white hover:bg-black/85 disabled:opacity-60"
            >
              {pending ? 'Signing out…' : 'Sign out everywhere'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${secondaryButtonClass} self-start`}>
          Sign out of all devices
        </button>
      )}
    </div>
  );
}
