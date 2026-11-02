'use client';

import Image from 'next/image';
import { useState, type FormEvent, type ReactNode } from 'react';
import { DocumentZone, type Slot } from './document-zone';
import { DOCUMENT_KEYS, type DocumentKey, type DocumentRef, type Documents } from './schema';
import { Alert, StepCard, StepFooter } from './ui';

// Shareholder KYC = own NID + photo, nominee NID + photo. Never a trade
// licence — investors must not be asked for one.
const ZONES: { title: string; hint: string; slots: Slot[] }[] = [
  {
    title: 'National ID (NID)',
    hint: 'Both sides required. JPG, PNG or PDF, up to 5 MB.',
    slots: [
      { key: 'nidFront', label: 'Front of your NID' },
      { key: 'nidBack', label: 'Back of your NID' },
    ],
  },
  {
    title: 'Passport-size photograph',
    hint: 'A recent photo against a plain background. JPG or PNG, up to 5 MB.',
    slots: [{ key: 'photo', label: 'Your photograph' }],
  },
  {
    title: "Nominee's National ID",
    hint: 'Both sides required. JPG, PNG or PDF, up to 5 MB.',
    slots: [
      { key: 'nomineeNidFront', label: "Front of nominee's NID" },
      { key: 'nomineeNidBack', label: "Back of nominee's NID" },
    ],
  },
  {
    title: "Nominee's photograph",
    hint: 'A recent photo against a plain background. JPG or PNG, up to 5 MB.',
    slots: [{ key: 'nomineePhoto', label: "Nominee's photograph" }],
  },
];

export function DocumentsStep({
  documents,
  submitting,
  submitError,
  onChange,
  onBack,
  onSubmit,
  onSessionExpired,
}: {
  documents: Documents;
  submitting: boolean;
  submitError: ReactNode;
  onChange: (key: DocumentKey, ref: DocumentRef | null) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSessionExpired: () => void;
}) {
  const [attempted, setAttempted] = useState(false);
  const missing = DOCUMENT_KEYS.filter((key) => !documents[key]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (missing.length === 0) onSubmit();
  }

  return (
    <StepCard
      eyebrow="Step 4 · KYC documents"
      title="Documents"
      description="Upload clear photos or scans. Files are encrypted before they are stored, and only you and our verification team can open them."
      badge={
        <span className="flex shrink-0 items-center gap-1 rounded-[2px] bg-surface-strong px-2 py-0.5 text-[11px] leading-5 text-muted">
          <Image src="/verify/tier-shield.svg" alt="" width={8.66667} height={10.8333} />
          Encrypted
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {ZONES.map((zone) => (
          <DocumentZone
            key={zone.title}
            title={zone.title}
            hint={zone.hint}
            slots={zone.slots}
            documents={documents}
            missing={attempted && zone.slots.some((slot) => !documents[slot.key])}
            onChange={onChange}
            onSessionExpired={onSessionExpired}
          />
        ))}

        {attempted && missing.length > 0 && (
          <Alert>
            <p>
              Upload all {DOCUMENT_KEYS.length} documents to continue — {missing.length} still missing.
            </p>
          </Alert>
        )}
        {submitError && <Alert>{submitError}</Alert>}

        <div className="flex items-start gap-3 rounded-[2px] border border-hairline bg-surface p-4">
          <Image src="/verify/declaration.svg" alt="" width={13.5} height={16.25} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-[19.5px] text-muted">
            By submitting, you confirm that these documents are genuine and belong to you and your
            nominee, and that the details you entered are correct.
          </p>
        </div>

        <StepFooter
          step={4}
          onBack={onBack}
          primaryLabel="Submit for verification"
          primaryIcon
          busy={submitting}
          busyLabel="Submitting…"
        />
      </form>
    </StepCard>
  );
}
