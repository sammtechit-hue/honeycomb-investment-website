import type { ReactNode } from 'react';
import { safeFilePath } from '@/lib/files';
import { DocumentPreview } from './document-preview';

// Uploaded documents on admin pages. These are server components: the stored
// URL is vetted here (safeFilePath), and only a safe same-origin path ever
// reaches the browser — an unvetted URL is never rendered or serialized.

// One document on a review page: an image preview, or "Open document" for a PDF.
export function DocumentTile({ label, url }: { label: string; url: string | null | undefined }) {
  const path = safeFilePath(url);

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{label}</figcaption>
      {!url ? (
        <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-rule bg-surface text-xs text-muted">
          Not uploaded
        </div>
      ) : !path ? (
        <div className="flex h-36 items-center justify-center rounded-md border border-emphasis bg-surface px-3 text-center text-xs leading-4 text-ink">
          Link isn’t a HoneyComb upload — not opened for safety
        </div>
      ) : (
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex h-36 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface hover:border-black"
        >
          <DocumentPreview path={path} label={label} />
        </a>
      )}
    </figure>
  );
}

// Inline text link for a receipt or document inside a table row.
export function DocumentLink({ url, children }: { url: string | null | undefined; children: ReactNode }) {
  const path = safeFilePath(url);
  if (!url) return <span className="text-muted">—</span>;
  if (!path) return <span className="text-xs text-ink">Unsafe link — not opened</span>;
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm leading-5 whitespace-nowrap text-ink underline decoration-rule underline-offset-2 hover:decoration-black"
    >
      {children}
    </a>
  );
}
