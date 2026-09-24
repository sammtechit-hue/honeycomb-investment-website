import { createZodDto } from 'nestjs-zod';
import { disbursementBatchUpdateInputSchema } from '@investment-platform/contracts/disbursementBatch';

// PATCH /api/disbursement-batch/:id — all batch fields optional
// (see packages/contracts/src/disbursementBatch.ts).
export class UpdateDisbursementBatchDto extends createZodDto(
  disbursementBatchUpdateInputSchema,
) {}
