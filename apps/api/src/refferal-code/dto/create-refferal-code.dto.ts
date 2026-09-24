import { createZodDto } from 'nestjs-zod';
import { referralCodeCreateInputSchema } from '@investment-platform/contracts/referralCode';

// POST /api/refferal-code — validated against the shared contract.
// See packages/contracts/src/referralCode.ts for the source of truth.
// (The module folder/route spelling "refferal-code" is kept as-is.)
export class CreateRefferalCodeDto extends createZodDto(
  referralCodeCreateInputSchema,
) {}
