import { createZodDto } from 'nestjs-zod';
import { withdrawalRequestCreateInputSchema } from '@investment-platform/contracts/withdrawal-request';

// POST /api/withdrawal-request — validated against the shared contract.
// See packages/contracts/src/withdrawal-request.ts for the source of truth.
//
// Example:
// {
//   "investmentId": "3f1d6a2e-1c4b-4f8e-9a7d-6b2e8c5f1a90",
//   "requestedAmount": 25000.50,
//   "withdrawalMethod": "manual",           // optional, defaults to "auto"
//   "requestDate": "2026-09-21",
//   "noticePeriodDays": 30,                 // optional
//   "noticePeriodEnd": "2026-10-21",        // optional
//   "disbursementDate": null                // optional
// }
export class CreateWithdrawalRequestDto extends createZodDto(
  withdrawalRequestCreateInputSchema,
) {}
