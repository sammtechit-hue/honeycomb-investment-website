'use client';

// Browser-side calls to /api (proxied to the Nest API by next.config.ts).
// Access tokens last 15 minutes, so a 401 means "renew and retry once":
// POST /api/auth/refresh swaps the refresh cookie for new tokens. Refresh
// tokens are single-use, so concurrent 401s share one refresh request.

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
  }
}

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function clientFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init);
  if (res.status !== 401) return res;
  if (!(await refreshSession())) throw new SessionExpiredError();
  return fetch(path, init);
}

export type UploadedFile = { url: string; mimeType: string };

export type UploadError = { status: number; message: string };

// XHR rather than fetch: fetch can't report upload progress.
function sendUpload(
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/kyc');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.response });
    xhr.onerror = () => reject(new Error('network'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export async function uploadKycFile(
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<UploadedFile> {
  let res = await sendUpload(file, onProgress, signal);
  if (res.status === 401) {
    if (!(await refreshSession())) throw new SessionExpiredError();
    res = await sendUpload(file, onProgress, signal);
  }

  if (res.status === 201) return res.body as UploadedFile;

  const message = (res.body as { message?: unknown } | null)?.message;
  const error: UploadError = {
    status: res.status,
    message:
      res.status === 413
        ? 'Files must be 5 MB or smaller.'
        : res.status === 429
          ? 'Too many uploads. Please wait a minute and try again.'
          : typeof message === 'string' && !message.startsWith('ThrottlerException')
            ? message
            : 'Upload failed. Please try again.',
  };
  throw error;
}
