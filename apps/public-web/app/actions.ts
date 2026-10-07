'use server';

import { roiCalculatorLeadCreateSchema } from '@investment-platform/contracts/roi-calculator-lead';
import { DEFAULT_LOCALE, hasLocale } from '@/lib/i18n/config';
import { loadDictionary } from '@/lib/i18n/load-dictionary';

// Server-only base URL. The browser never calls the API directly: the API's
// CORS and CSRF-origin checks only accept secure-web's origin, and this
// server-to-server request carries no Origin header, so it passes without
// widening that allowlist to the public site.
const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000/api';

export type SubmitLeadState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

// locale only picks the language of the returned message. Server Actions
// can't read root params, so the form passes it in.
export async function submitRoiLead(values: unknown, locale: unknown): Promise<SubmitLeadState> {
  const t = (await loadDictionary(hasLocale(locale) ? locale : DEFAULT_LOCALE)).leadAction;

  // Re-validate on the server with the same schema the form used — the
  // client-side check is a UX convenience, never the source of truth.
  const parsed = roiCalculatorLeadCreateSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: t.checkFields,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/roi-calculator-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { success: false, message: t.saveFailed };
    }
  } catch {
    return { success: false, message: t.unreachable };
  }

  return { success: true, message: t.success };
}
