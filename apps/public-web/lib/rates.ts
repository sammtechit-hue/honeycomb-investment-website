import { API_BASE_URL, isShowDemo } from './site';
import {
  DEFAULT_RATES,
  FIXED_RATE_BPS,
  VARIABLE_RATE_MAX_BPS,
  VARIABLE_RATE_MIN_BPS,
  type PublicRates,
} from './roi';

/**
 * Retrieves investment rates.
 * When SHOW_DEMO is true, returns mock/default rates.
 * When SHOW_DEMO is false, fetches rates from the backend API,
 * cached using Next.js time-based revalidation (1 hour).
 */
export async function getRates(): Promise<PublicRates> {
  if (isShowDemo()) {
    return DEFAULT_RATES;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/rates`, {
      next: { revalidate: 3600, tags: ['rates'] },
    });

    if (res.ok) {
      const data = await res.json();
      const payload = data?.data ?? data;

      if (payload && typeof payload === 'object') {
        const fixed = Number(payload.fixedRateBps ?? payload.fixedRate);
        const minVar = Number(payload.variableRateMinBps ?? payload.variableMinRate ?? payload.minRate);
        const maxVar = Number(payload.variableRateMaxBps ?? payload.variableMaxRate ?? payload.maxRate);

        return {
          fixedRateBps: !isNaN(fixed) && fixed > 0 ? fixed : FIXED_RATE_BPS,
          variableRateMinBps: !isNaN(minVar) && minVar > 0 ? minVar : VARIABLE_RATE_MIN_BPS,
          variableRateMaxBps: !isNaN(maxVar) && maxVar > 0 ? maxVar : VARIABLE_RATE_MAX_BPS,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic rates from API, using defaults:', error);
  }

  return DEFAULT_RATES;
}
