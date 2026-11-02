import { z } from 'zod';
import { phoneNumberSchema } from '@investment-platform/contracts/common';

// The +880 prefix is fixed in the UI, so a typed leading 0 ("01712…") is
// dropped rather than producing "+88001712…".
export const withCountryCode = (local: string) => `+880${local.trim().replace(/^0/, '')}`;

// What the user types after the fixed +880 prefix.
export const localMobileSchema = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .refine((value) => phoneNumberSchema.safeParse(withCountryCode(value)).success, {
    message: 'Enter a valid Bangladeshi mobile number',
  });
