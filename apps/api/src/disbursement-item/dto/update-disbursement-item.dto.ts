import { createZodDto } from 'nestjs-zod';
import { disbursementItemUpdateInputSchema } from '@investment-platform/contracts/disbursementItem';

// PATCH /api/disbursement-item/:id — all line item fields optional
// (see packages/contracts/src/disbursementItem.ts).
export class UpdateDisbursementItemDto extends createZodDto(
  disbursementItemUpdateInputSchema,
) {}
