import { createZodDto } from 'nestjs-zod';
import { disbursementBatchCreateInputSchema } from '@investment-platform/contracts/disbursementBatch';

// POST /api/admin/disbursement-batch — validated against the shared contract.
// See packages/contracts/src/disbursementBatch.ts for the source of truth.
export class CreateDisbursementBatchDto extends createZodDto(
  disbursementBatchCreateInputSchema,
) {}
