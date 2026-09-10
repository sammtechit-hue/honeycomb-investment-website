'use server';

import { investorUpdateInputSchema } from '@investment-platform/contracts/investor';

const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000/api';

export type UpdateInvestorState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function updateInvestor(
  investorId: string,
  values: unknown,
): Promise<UpdateInvestorState> {
  // Re-validate on the server with the same schema the form used — the
  // client-side check is a UX convenience, never the source of truth.
  const parsed = investorUpdateInputSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const res = await fetch(`${API_BASE_URL}/investor/${investorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      success: false,
      message: body?.message ?? `Update failed (${res.status})`,
    };
  }

  return { success: true, message: 'Profile updated' };
}
