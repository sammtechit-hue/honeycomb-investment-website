import { createZodDto } from 'nestjs-zod';
import { referralCreateInputSchema } from '@investment-platform/contracts/referral';

// POST /api/referral — validated against the shared contract.
// See packages/contracts/src/referral.ts for the source of truth.
export class CreateReferralDto extends createZodDto(referralCreateInputSchema) {}
