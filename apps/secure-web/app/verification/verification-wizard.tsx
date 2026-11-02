'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from '@/lib/api-error';
import { SessionExpiredError, clientFetch } from '@/lib/client-api';
import { BankStep } from './bank-step';
import { DocumentsStep } from './documents-step';
import { NomineeStep } from './nominee-step';
import { PersonalStep } from './personal-step';
import {
  DOCUMENT_KEYS,
  EMPTY_WIZARD,
  bankFormSchema,
  nomineeFormSchema,
  personalSchema,
  toInvestorPayload,
  type DocumentKey,
  type DocumentRef,
  type WizardData,
} from './schema';
import { STEPS, Stepper } from './ui';

// The draft lives in sessionStorage: it survives reloads and a session
// renewal round-trip, but not the tab — bank and identity details shouldn't
// linger on a shared computer. Uploaded files are already on the server.
const storageKey = (userId: string) => `hc:verification:${userId}`;

function loadDraft(userId: string): WizardData {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return EMPTY_WIZARD;
    const saved = JSON.parse(raw) as Partial<WizardData>;
    // Re-validate: a draft from an older version of this form is dropped
    // section by section rather than trusted.
    const documents: WizardData['documents'] = {};
    for (const key of DOCUMENT_KEYS) {
      const doc = saved.documents?.[key];
      if (doc && typeof doc.url === 'string' && typeof doc.name === 'string') documents[key] = doc;
    }
    return {
      personal: personalSchema.safeParse(saved.personal).success ? saved.personal! : null,
      nominee: nomineeFormSchema.safeParse(saved.nominee).success ? saved.nominee! : null,
      bank: bankFormSchema.safeParse(saved.bank).success ? saved.bank! : null,
      documents,
    };
  } catch {
    return EMPTY_WIZARD;
  }
}

// Which step an API validation error belongs to.
function stepForField(field: string | undefined, message: string | null): number {
  const text = `${field ?? ''} ${message ?? ''}`.toLowerCase();
  if (text.includes('document') || text.includes('kyc') || /nid|photo/.test(field ?? '')) return 4;
  if (text.includes('bank') || text.includes('routing') || text.includes('account')) return 3;
  if (text.includes('nominee')) return 2;
  return 1;
}

// Client-only (see wizard-loader.tsx), so the draft can be read from
// sessionStorage on first render without a hydration mismatch.
export default function VerificationWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<WizardData>(() => loadDraft(userId));
  const [sessionExpired, setSessionExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ReactNode>(null);

  // Mirror every change into sessionStorage. A ref flag skips the write once
  // the draft is submitted, so it isn't recreated after removal.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current) return;
    try {
      sessionStorage.setItem(storageKey(userId), JSON.stringify(data));
    } catch {
      // Storage full or blocked — the wizard still works for this visit.
    }
  }, [data, userId]);

  // Always a functional update: two uploads can finish back to back, and
  // each must build on the other's result rather than a stale render.
  const update = (patch: (prev: WizardData) => WizardData) => setData(patch);

  const completed = [
    !!data.personal,
    !!data.nominee,
    !!data.bank,
    DOCUMENT_KEYS.every((key) => data.documents[key]),
  ];
  // Furthest step the user may open: one past the last completed step.
  const firstIncomplete = completed.findIndex((done) => !done);
  const maxStep = firstIncomplete === -1 ? 4 : firstIncomplete + 1;
  const requested = Number(searchParams.get('step')) || 1;
  const step = Math.min(Math.max(requested, 1), maxStep);

  // Keep the URL honest if it asked for a step that isn't unlocked yet.
  useEffect(() => {
    if (requested !== step) router.replace(`/verification?step=${step}`, { scroll: false });
  }, [requested, step, router]);

  // Each step is a history entry, so the browser Back button works.
  const goTo = useCallback(
    (target: number) => {
      setSubmitError(null);
      router.push(`/verification?step=${target}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router],
  );

  const setDocument = (key: DocumentKey, ref: DocumentRef | null) =>
    update((prev) => {
      const documents = { ...prev.documents };
      if (ref) documents[key] = ref;
      else delete documents[key];
      return { ...prev, documents };
    });

  async function submit() {
    setSubmitError(null);
    const payload = toInvestorPayload(data);
    if (!payload) {
      setSubmitError(<p>Some details are missing or out of date. Please review each step.</p>);
      return;
    }

    setSubmitting(true);
    try {
      const res = await clientFetch('/api/investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 409) {
        // 409: a profile already exists (e.g. submitted from another tab) —
        // either way the server page now shows the submitted state.
        submittedRef.current = true;
        sessionStorage.removeItem(storageKey(userId));
        router.replace('/verification');
        router.refresh();
        return;
      }

      const error = await readApiError(res);
      if (res.status === 400) {
        const [field, fieldMessage] = Object.entries(error.fieldErrors)[0] ?? [];
        const message = fieldMessage ?? error.message ?? GENERIC_ERROR;
        const target = stepForField(field, message);
        setSubmitError(
          <>
            <p>{message}</p>
            {target !== 4 && (
              <button type="button" onClick={() => goTo(target)} className="self-start underline">
                Go to {STEPS[target - 1]}
              </button>
            )}
          </>,
        );
      } else {
        setSubmitError(<p>{res.status === 429 ? RATE_LIMIT_ERROR : GENERIC_ERROR}</p>);
      }
    } catch (error) {
      if (error instanceof SessionExpiredError) setSessionExpired(true);
      else setSubmitError(<p>{NETWORK_ERROR}</p>);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-8 sm:gap-12">
      <Stepper current={step} completed={completed} onSelect={goTo} />

      {sessionExpired && (
        <div role="alert" className="w-full max-w-[640px] rounded-md border-2 border-emphasis bg-white p-4 text-sm leading-5">
          Your session has expired. Your progress in this tab is saved —{' '}
          <Link href="/login?next=%2Fverification" className="font-bold underline">
            sign in again
          </Link>{' '}
          to continue.
        </div>
      )}

      {step === 1 && (
        <PersonalStep
          initial={data.personal}
          onComplete={(personal) => {
            update((prev) => ({ ...prev, personal }));
            goTo(2);
          }}
        />
      )}
      {step === 2 && (
        <NomineeStep
          initial={data.nominee}
          onBack={() => goTo(1)}
          onComplete={(nominee) => {
            update((prev) => ({ ...prev, nominee }));
            goTo(3);
          }}
        />
      )}
      {step === 3 && (
        <BankStep
          initial={data.bank}
          onBack={() => goTo(2)}
          onComplete={(bank) => {
            update((prev) => ({ ...prev, bank }));
            goTo(4);
          }}
        />
      )}
      {step === 4 && (
        <DocumentsStep
          documents={data.documents}
          submitting={submitting}
          submitError={submitError}
          onChange={setDocument}
          onBack={() => goTo(3)}
          onSubmit={submit}
          onSessionExpired={() => setSessionExpired(true)}
        />
      )}
    </div>
  );
}
