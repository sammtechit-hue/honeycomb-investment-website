import { createZodDto } from 'nestjs-zod';
import { adminNotificationCreateInputSchema } from '@investment-platform/contracts/notification';

// POST /api/notification — validated against the shared contract.
// See packages/contracts/src/notification.ts for the source of truth.
//
// Example:
// {
//   "type": "new_investment_request",
//   "message": "Investor Rahim requested a new investment of 50,000 BDT",
//   "referenceId": "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",  // optional pair
//   "referenceType": "investment"                           // optional pair
// }
export class CreateNotificationDto extends createZodDto(
  adminNotificationCreateInputSchema,
) {}
