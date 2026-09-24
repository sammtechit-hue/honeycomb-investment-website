import { createZodDto } from 'nestjs-zod';
import { referralUpdateInputSchema } from '@investment-platform/contracts/referral';

// PATCH /api/referral/:id — all referral fields optional
// (see packages/contracts/src/referral.ts).
//
// Example:
// PATCH /api/referral/:id
// {
//   "bonusAmount": 500
// }
export class UpdateReferralDto extends createZodDto(referralUpdateInputSchema) {}
