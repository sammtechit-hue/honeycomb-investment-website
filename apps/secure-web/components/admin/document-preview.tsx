'use client';

import { useState } from 'react';

// Image preview of an already-vetted file path (see document.tsx). Falls
// back to an "Open document" label when the file isn't an image (PDF).
export function DocumentPreview({ path, label }: { path: string; label: string }) {
  const [isImage, setIsImage] = useState(true);

  return isImage ? (
    // Plain <img>: the file is private and uncacheable, so next/image's
    // optimiser can't (and mustn't) fetch it.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={path} alt={label} className="h-full w-full object-contain" onError={() => setIsImage(false)} />
  ) : (
    <span className="text-sm leading-5 text-ink underline decoration-rule underline-offset-2 group-hover:decoration-black">
      Open document
    </span>
  );
}
