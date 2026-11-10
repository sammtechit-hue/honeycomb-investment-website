import { createZodDto } from 'nestjs-zod';
import { disbursementBatchWindowCreateInputSchema } from '@investment-platform/contracts/disbursementBatch';

// POST /api/admin/disbursement-batch/:windowId — validated against the shared
// contract. See packages/contracts/src/disbursementBatch.ts for the source of
// truth.
//
// Example:
// {
//   "exportType": "cbl",
//   "batchDate": "2026-07-10"
// }
export class CreateDisbursementBatchDto extends createZodDto(
  disbursementBatchWindowCreateInputSchema,
) {}
