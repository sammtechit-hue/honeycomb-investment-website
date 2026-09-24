import { createZodDto } from 'nestjs-zod';
import { withdrawalRequestUpdateInputSchema } from '@investment-platform/contracts/withdrawal-request';

// PATCH /api/withdrawal-request/:id — all fields optional
// (see packages/contracts/src/withdrawal-request.ts).
//
// Example (move a request through its lifecycle):
// PATCH /api/withdrawal-request/:id
// {
//   "status": "ready",
//   "disbursementDate": "2026-10-21"
// }
export class UpdateWithdrawalRequestDto extends createZodDto(
  withdrawalRequestUpdateInputSchema,
) {}
