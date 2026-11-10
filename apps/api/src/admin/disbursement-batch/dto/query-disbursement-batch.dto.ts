import { createZodDto } from 'nestjs-zod';
import { disbursementBatchQuerySchema } from '@investment-platform/contracts/disbursementBatch';

// GET /api/admin/disbursement-batch?search=&exportType=cbl&status=draft
//   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class DisbursementBatchQueryDto extends createZodDto(
  disbursementBatchQuerySchema,
) {}
