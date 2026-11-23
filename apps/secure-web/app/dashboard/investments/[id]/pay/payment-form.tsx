'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Field, FieldError, FormActions, Segmented, describedBy, inputClass } from '@/components/dashboard/form';
import { SessionExpiredError, uploadKycFile, type UploadError } from '@/lib/client-api';
import { submitJson } from '@/lib/submit';

// The website takes no payments. Investors pay HoneyComb by hand, usually
// by bank transfer, then record it here. The API also accepts nagad and
// rocket; add them here if HoneyComb starts accepting them.
const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'bkash', label: 'bKash' },
] as const;

const SENDER_LABEL = {
  bkash: ['bKash number you paid from', 'e.g. 01712345678'],
  bank_transfer: ['Bank and account you paid from', 'e.g. BRAC Bank, A/C ending 4821'],
} as const;

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  paymentMethod: z.enum(['bank_transfer', 'bkash']),
  amount: z
    .string()
    .trim()
    .refine((v) => Number(v.replace(/,/g, '')) > 0, 'Enter the amount you paid'),
  senderAccountInfo: z.string().trim().min(3, 'Tell us which account you paid from').max(150),
});
type Values = z.infer<typeof schema>;

type Proof = { name: string; url: string } | null;

export function PaymentForm({ investmentId, defaultAmount }: { investmentId: string; defaultAmount: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [proof, setProof] = useState<Proof>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'bank_transfer', amount: String(Number(defaultAmount)), senderAccountInfo: '' },
  });
  const method = useWatch({ control, name: 'paymentMethod' });
  const [senderLabel, senderPlaceholder] = SENDER_LABEL[method];

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setProof(null);
    setProofError(null);
    if (!ACCEPT.split(',').includes(file.type)) {
      setProofError('Upload a JPG, PNG, WebP or PDF file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setProofError('Files must be 5 MB or smaller.');
      return;
    }

    abort.current?.abort();
    abort.current = new AbortController();
    setProgress(0);
    try {
      const uploaded = await uploadKycFile(file, setProgress, abort.current.signal);
      setProof({ name: file.name, url: uploaded.url });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setProofError(
        error instanceof SessionExpiredError
          ? error.message
          : ((error as UploadError).message ?? 'Upload failed. Please try again.'),
      );
    } finally {
      setProgress(null);
    }
  }

  async function onSubmit(values: Values) {
    setSubmitError(null);
    if (!proof) {
      setProofError('Upload a screenshot or receipt of your payment.');
      return;
    }
    const result = await submitJson('/api/incoming-payment', {
      investmentId,
      amount: Number(values.amount.replace(/,/g, '')),
      paymentMethod: values.paymentMethod,
      senderAccountInfo: values.senderAccountInfo,
      screenshotUrl: proof.url,
    });
    if (result.ok) {
      router.push('/dashboard/investments?submitted=payment');
      router.refresh();
      return;
    }
    setSubmitError(result.message);
  }

  const uploading = progress !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && (
        <Alert>
          <p>{submitError}</p>
        </Alert>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm leading-5 text-ink">
          Payment method <span aria-hidden>*</span>
        </legend>
        <Segmented
          name="Payment method"
          options={METHODS}
          value={method}
          onChange={(value) => setValue('paymentMethod', value, { shouldValidate: true })}
        />
      </fieldset>

      <Field id="amount" label="Amount paid (৳)" error={errors.amount?.message}>
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!!errors.amount}
          aria-describedby={describedBy('amount', errors.amount?.message)}
          {...register('amount')}
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <Field id="senderAccountInfo" label={senderLabel} error={errors.senderAccountInfo?.message}>
        <input
          id="senderAccountInfo"
          autoComplete="off"
          placeholder={senderPlaceholder}
          aria-invalid={!!errors.senderAccountInfo}
          aria-describedby={describedBy('senderAccountInfo', errors.senderAccountInfo?.message)}
          {...register('senderAccountInfo')}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <label htmlFor="proof" className="text-sm leading-5 text-ink">
          Payment proof <span aria-hidden>*</span>
        </label>
        <input
          id="proof"
          type="file"
          accept={ACCEPT}
          disabled={uploading || isSubmitting}
          aria-invalid={!!proofError}
          aria-describedby={proofError ? 'proof-error' : 'proof-hint'}
          onChange={(event) => pickFile(event.target.files?.[0])}
          className="text-sm text-secondary file:mr-3 file:h-10 file:rounded-md file:border file:border-emphasis file:bg-white file:px-4 file:text-sm file:text-ink hover:file:bg-surface"
        />
        {proofError ? (
          <FieldError id="proof-error" message={proofError} />
        ) : (
          <p id="proof-hint" className="text-xs leading-4 text-muted" aria-live="polite">
            {uploading
              ? `Uploading… ${Math.round((progress ?? 0) * 100)}%`
              : proof
                ? `Uploaded: ${proof.name}`
                : 'Your bank transfer receipt or a screenshot of the confirmation. JPG, PNG, WebP or PDF, up to 5 MB.'}
          </p>
        )}
      </div>

      <FormActions
        busy={isSubmitting || uploading}
        label="Submit payment for review"
        busyLabel={uploading ? 'Uploading…' : 'Submitting…'}
        cancelHref="/dashboard/investments"
      />
    </form>
  );
}
