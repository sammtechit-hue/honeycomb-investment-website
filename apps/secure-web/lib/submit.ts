'use client';

import { GENERIC_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, readApiError } from './api-error';
import { SessionExpiredError, clientFetch } from './client-api';

// One JSON request from a dashboard form, with every failure turned into
// text the form can show: a message for the alert, plus per-field messages
// from the API's validation errors.
export type SubmitResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export async function submitJson(path: string, body: unknown, method = 'POST'): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await clientFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof SessionExpiredError ? error.message : NETWORK_ERROR;
    return { ok: false, message, fieldErrors: {} };
  }

  if (res.ok) return { ok: true, data: await res.json().catch(() => null) };

  const error = await readApiError(res);
  const message =
    res.status === 429
      ? RATE_LIMIT_ERROR
      : res.status >= 500
        ? GENERIC_ERROR
        : (error.message && error.message !== 'Validation failed' ? error.message : null) ??
          Object.values(error.fieldErrors)[0] ??
          GENERIC_ERROR;
  return { ok: false, message, fieldErrors: error.fieldErrors };
}
