import { createZodDto } from 'nestjs-zod';
import { disbursementItemUpdateInputSchema } from '@investment-platform/contracts/disbursementItem';

// PATCH /api/admin/disbursement-item/:id — all line item fields optional
// (see packages/contracts/src/disbursementItem.ts).
//
// Example:
// PATCH /api/admin/disbursement-item/:id
// {
//   "amount": 15000,
//   "remarks": "Corrected payout amount"
// }
export class UpdateDisbursementItemDto extends createZodDto(
  disbursementItemUpdateInputSchema,
) {}
