import { createZodDto } from 'nestjs-zod';
import { referralCodeUpdateInputSchema } from '@investment-platform/contracts/referralCode';

// PATCH /api/refferal-code/:id — all fields optional
// (see packages/contracts/src/referralCode.ts).
//
// Example (mark a code as redeemed):
// PATCH /api/refferal-code/:id
// {
//   "isUsed": true,
//   "referredId": "5c1f2b7e-...-9d3a",
//   "usedAt": "2026-09-20T10:15:00.000Z"
// }
export class UpdateRefferalCodeDto extends createZodDto(
  referralCodeUpdateInputSchema,
) {}
