'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Field, Segmented, describedBy, inputClass, primaryButtonClass, rowActionClass } from '@/components/dashboard/form';
import { Notice } from '@/components/dashboard/ui';
import { allowlistError } from '@/lib/ip-allowlist';
import { submitJson } from '@/lib/submit';

// Mirrors createAdminAccountInputSchema (packages/contracts/src/auth.ts).
// The API checks everything again, including the IP list.
const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(150, 'Up to 150 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(150, 'Up to 150 characters'),
  role: z.enum(['ADMIN', 'MODERATOR']),
  department: z.string().trim().max(100, 'Up to 100 characters'),
  allowedIpRange: z
    .string()
    .trim()
    .max(100, 'Up to 100 characters')
    .superRefine((v, ctx) => {
      const error = allowlistError(v);
      if (error) ctx.addIssue({ code: 'custom', message: error });
    }),
});

type Values = z.infer<typeof schema>;
type Key = keyof Values;

const ROLE_OPTIONS = [
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMIN', label: 'Admin' },
] as const;

const ROLE_HINT: Record<Values['role'], string> = {
  MODERATOR:
    'Day-to-day work: reviews investors, payments, change requests and payouts. Can look at projects, rates and settings but not change them, and can’t see the audit log.',
  ADMIN:
    'Everything a moderator does, plus changing projects, monthly rates and profit settings, running payouts and reading the audit log.',
};

const EMPTY: Values = { name: '', email: '', role: 'MODERATOR', department: '', allowedIpRange: '' };

type Sent = { email: string; emailSent: boolean };

export function InviteForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [, startRefresh] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const [role, ipList] = useWatch({ control, name: ['role', 'allowedIpRange'] });

  async function onSubmit(values: Values) {
    setSubmitError(null);
    setSent(null);
    const result = await submitJson('/api/admin/accounts', {
      name: values.name,
      email: values.email,
      role: values.role,
      ...(values.department && { department: values.department }),
      ...(values.allowedIpRange && { allowedIpRange: values.allowedIpRange }),
    });

    if (result.ok) {
      const data = result.data as { inviteEmailSent?: boolean } | null;
      setSent({ email: values.email, emailSent: data?.inviteEmailSent !== false });
      reset(EMPTY);
      startRefresh(() => router.refresh());
      return;
    }

    // Put the API's messages next to the fields they belong to.
    let placed = false;
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (field in EMPTY) {
        setError(field as Key, { message });
        placed = true;
      }
    }
    if (/already exists/i.test(result.message)) {
      setError('email', { message: 'Someone already has an account with this email' });
      return;
    }
    if (/allowedIpRange/.test(result.message)) {
      setError('allowedIpRange', { message: 'Use IP addresses or ranges separated by commas' });
      return;
    }
    if (!placed) setSubmitError(result.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {sent &&
        (sent.emailSent ? (
          <Notice title={`Invite sent to ${sent.email}`}>
            They’ll get an email with a link to set their password. The link works for 72 hours.
          </Notice>
        ) : (
          <Alert>
            <p>
              <strong>The account for {sent.email} was created, but the invite email didn’t send.</strong> Use
              “Resend invite” in the list below once email is working.
            </p>
          </Alert>
        ))}
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="invite-name" label="Full name" error={errors.name?.message}>
          <input
            id="invite-name"
            autoComplete="off"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy('invite-name', errors.name?.message)}
            className={inputClass}
            {...register('name')}
          />
        </Field>
        <Field id="invite-email" label="Work email" error={errors.email?.message}>
          <input
            id="invite-email"
            type="email"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('invite-email', errors.email?.message)}
            className={inputClass}
            {...register('email')}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span id="invite-role-label" className="text-sm leading-5 text-ink">
          Role <span aria-hidden>*</span>
        </span>
        <Segmented
          name="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setValue('role', v, { shouldDirty: true })}
        />
        <p className="text-xs leading-4 text-muted">{ROLE_HINT[role]}</p>
      </div>

      <Field
        id="invite-department"
        label="Department"
        optional
        hint="For example “Operations” or “Accounts”."
        error={errors.department?.message}
      >
        <input
          id="invite-department"
          autoComplete="off"
          aria-invalid={!!errors.department}
          aria-describedby={describedBy('invite-department', errors.department?.message, 'hint')}
          className={inputClass}
          {...register('department')}
        />
      </Field>

      <Field
        id="invite-ips"
        label="Only allow sign-in from these IP addresses"
        optional
        hint="Leave empty to allow any address. Separate several with commas, e.g. 203.0.113.7, 10.20.0.0/16."
        error={errors.allowedIpRange?.message}
      >
        <input
          id="invite-ips"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!errors.allowedIpRange}
          aria-describedby={describedBy('invite-ips', errors.allowedIpRange?.message, 'hint')}
          className={`${inputClass} font-mono`}
          {...register('allowedIpRange')}
        />
      </Field>
      {ipList.trim() !== '' && !errors.allowedIpRange && (
        <Notice title="Check these addresses carefully">
          This person will only be able to sign in, and stay signed in, from the addresses above. They can still
          set their password from anywhere, but a wrong address locks them out after that, and it can’t be changed
          here afterwards.
        </Notice>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-end">
        {sent && (
          <button type="button" onClick={() => setSent(null)} className={rowActionClass}>
            Dismiss
          </button>
        )}
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? 'Sending invite…' : 'Send invite'}
        </button>
      </div>
    </form>
  );
}

export function ResendButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function resend() {
    setBusy(true);
    setNote(null);
    const result = await submitJson(`/api/admin/accounts/${userId}/resend-invite`, {});
    setBusy(false);
    if (result.ok) {
      const emailSent = (result.data as { inviteEmailSent?: boolean } | null)?.inviteEmailSent !== false;
      setNote(
        emailSent
          ? { ok: true, text: 'Sent. The earlier link no longer works.' }
          : { ok: false, text: 'A new link was made, but the email didn’t send.' },
      );
      startRefresh(() => router.refresh());
      return;
    }
    setNote({ ok: false, text: result.message });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={resend}
        disabled={busy || refreshing}
        aria-label={`Resend invite to ${email}`}
        className={`${rowActionClass} disabled:opacity-60`}
      >
        {busy ? 'Sending…' : 'Resend invite'}
      </button>
      {note && (
        <span role={note.ok ? 'status' : 'alert'} className="max-w-60 text-right text-xs leading-4 text-ink">
          {note.text}
        </span>
      )}
    </div>
  );
}
