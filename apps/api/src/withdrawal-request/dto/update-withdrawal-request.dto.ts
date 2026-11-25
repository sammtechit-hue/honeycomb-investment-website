import { createZodDto } from 'nestjs-zod';
import { withdrawalRequestCancelInputSchema } from '@investment-platform/contracts/withdrawal-request';

// PATCH /api/withdrawal-request/:id — an investor may only cancel an open
// request. Any other field or status is rejected with a 400.
// (see packages/contracts/src/withdrawal-request.ts).
//
// Example:
// PATCH /api/withdrawal-request/:id
// {
//   "status": "cancelled"
// }
export class UpdateWithdrawalRequestDto extends createZodDto(
  withdrawalRequestCancelInputSchema,
) {}
