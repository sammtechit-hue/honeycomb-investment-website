import { createZodDto } from 'nestjs-zod';
import { disbursementBatchUpdateInputSchema } from '@investment-platform/contracts/disbursementBatch';

// PATCH /api/admin/disbursement-batch/:id — all batch fields optional
// (see packages/contracts/src/disbursementBatch.ts).
//
// Example:
// PATCH /api/admin/disbursement-batch/:id
// {
//   "status": "exported"
// }
export class UpdateDisbursementBatchDto extends createZodDto(
  disbursementBatchUpdateInputSchema,
) {}
