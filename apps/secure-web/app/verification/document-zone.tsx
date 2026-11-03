'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { SessionExpiredError, uploadKycFile, type UploadError } from '@/lib/client-api';
import type { DocumentKey, DocumentRef, Documents } from './schema';
import { FieldError } from './ui';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';

export type Slot = { key: DocumentKey; label: string };

type Upload = { name: string; size: number; progress: number; controller: AbortController };

function formatSize(bytes: number) {
  // Non-breaking space keeps "1.4 MB" on one line.
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// The upload URL points at secure-web's own /api proxy; open it by path so
// the link keeps working whatever host it was issued under.
function viewHref(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function DocumentZone({
  title,
  hint,
  slots,
  documents,
  missing,
  onChange,
  onSessionExpired,
}: {
  title: string;
  hint: string;
  slots: Slot[];
  documents: Documents;
  // Set when the user tried to submit with this zone incomplete.
  missing: boolean;
  onChange: (key: DocumentKey, ref: DocumentRef | null) => void;
  onSessionExpired: () => void;
}) {
  const [uploads, setUploads] = useState<Partial<Record<DocumentKey, Upload>>>({});
  const [errors, setErrors] = useState<Partial<Record<DocumentKey, string>>>({});
  // In-flight uploads, cancelled if the step unmounts (Back, navigation).
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const attached = slots.filter((slot) => documents[slot.key]).length;
  const uploading = slots.some((slot) => uploads[slot.key]);
  const complete = attached === slots.length;

  async function start(slot: Slot, file: File) {
    setErrors((prev) => ({ ...prev, [slot.key]: undefined }));
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, [slot.key]: 'Upload a JPG, PNG, WEBP or PDF file.' }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrors((prev) => ({ ...prev, [slot.key]: 'Files must be 5 MB or smaller.' }));
      return;
    }

    const controller = new AbortController();
    controllers.current.add(controller);
    setUploads((prev) => ({ ...prev, [slot.key]: { name: file.name, size: file.size, progress: 0, controller } }));

    try {
      const result = await uploadKycFile(
        file,
        (progress) =>
          setUploads((prev) => {
            const current = prev[slot.key];
            return current ? { ...prev, [slot.key]: { ...current, progress } } : prev;
          }),
        controller.signal,
      );
      onChange(slot.key, { url: result.url, mimeType: result.mimeType, name: file.name, size: file.size });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Cancelled by the user — nothing to report.
      } else if (error instanceof SessionExpiredError) {
        onSessionExpired();
      } else {
        // An Error is a network failure; the API's refusals are UploadError.
        const message =
          error instanceof Error
            ? 'Upload failed. Check your connection and try again.'
            : (error as UploadError).message;
        setErrors((prev) => ({ ...prev, [slot.key]: message }));
      }
    } finally {
      controllers.current.delete(controller);
      setUploads((prev) => ({ ...prev, [slot.key]: undefined }));
    }
  }

  return (
    <fieldset
      className={`flex flex-col gap-3 rounded border bg-white p-4 ${
        complete ? 'border-rule' : missing ? 'border-2 border-dashed border-emphasis' : 'border-dashed border-rule'
      }`}
    >
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          {/* Inline (not flex) so the status mark follows the last word when the title wraps. */}
          <p className="text-base leading-6 font-bold text-ink" aria-hidden>
            {title}
            {complete && (
              <Image
                src="/verify/zone-complete.svg"
                alt=""
                width={13.3333}
                height={13.3333}
                className="ml-2 inline-block align-[-1px]"
              />
            )}
            {uploading && <span className="ml-2 inline-block size-2 rounded-full bg-black align-middle" />}
          </p>
          <p className="text-xs leading-4 text-muted">{hint}</p>
        </div>
        <p
          className={`shrink-0 rounded-[2px] px-2 py-0.5 text-[11px] leading-5 text-ink ${
            complete ? 'border border-hairline bg-surface' : 'bg-surface-strong'
          }`}
        >
          {uploading ? 'Uploading' : `${attached} of ${slots.length} attached`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {slots.map((slot) => {
          const doc = documents[slot.key];
          const upload = uploads[slot.key];
          const error = errors[slot.key];

          if (upload) {
            return (
              <div key={slot.key} className="flex flex-col gap-2 rounded-[2px] border border-hairline bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <FileSummary name={upload.name} detail={`${slot.label} · ${formatSize(upload.size)}`} pdf={false} />
                  <button
                    type="button"
                    onClick={() => upload.controller.abort()}
                    aria-label={`Cancel uploading ${slot.label}`}
                    className="p-1"
                  >
                    <Image src="/verify/cancel-x.svg" alt="" width={10.5} height={10.5} />
                  </button>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Uploading ${slot.label}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(upload.progress * 100)}
                  className="h-1.5 overflow-hidden rounded-xl bg-surface-strong"
                >
                  <div className="h-full bg-black transition-[width]" style={{ width: `${upload.progress * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs leading-4 text-muted">
                  <span>{upload.progress < 1 ? 'Uploading…' : 'Encrypting…'}</span>
                  <span>{Math.round(upload.progress * 100)}%</span>
                </div>
              </div>
            );
          }

          if (doc) {
            return (
              <div
                key={slot.key}
                className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline bg-surface p-3"
              >
                <FileSummary
                  name={doc.name}
                  detail={`${slot.label} · ${formatSize(doc.size)}`}
                  pdf={doc.mimeType === 'application/pdf'}
                />
                <div className="flex shrink-0 items-center gap-3 text-xs leading-4">
                  <span className="hidden items-center gap-1 text-ink sm:flex">
                    <Image src="/verify/ready-check.svg" alt="" width={10.1875} height={7.51562} />
                    Ready
                  </span>
                  <a
                    href={viewHref(doc.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted underline hover:text-ink"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() => onChange(slot.key, null)}
                    aria-label={`Remove ${slot.label}`}
                    className="text-muted underline hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={slot.key} className="flex flex-col gap-1.5">
              <DropTarget label={slot.label} onFile={(file) => start(slot, file)} />
              {error && <FieldError message={error} />}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function FileSummary({ name, detail, pdf }: { name: string; detail: string; pdf: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] bg-chip">
        {pdf ? (
          <Image src="/verify/file-doc.svg" alt="" width={12} height={15} />
        ) : (
          <Image src="/verify/file-image.svg" alt="" width={13.5} height={13.5} />
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm leading-5 text-ink">{name}</span>
        <span className="text-xs leading-4 text-muted">{detail}</span>
      </span>
    </div>
  );
}

function DropTarget({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center gap-1 rounded border-2 border-dashed px-4 py-5 text-center ${
        dragging ? 'border-black bg-surface' : 'border-rule bg-white'
      }`}
    >
      <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-chip">
        <Image src="/verify/upload.svg" alt="" width={13.3333} height={16.6667} />
      </span>
      <p className="text-sm leading-5 font-bold text-ink">{label}</p>
      <p className="text-sm leading-5 text-muted">
        <span className="hidden sm:inline">Drag and drop here, or </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-ink underline sm:normal-case"
        >
          <span className="sm:hidden">Choose a file</span>
          <span className="hidden sm:inline">browse files</span>
        </button>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Upload ${label}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
