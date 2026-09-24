import { createZodDto } from 'nestjs-zod';
import { disbursementBatchQuerySchema } from '@investment-platform/contracts/disbursementBatch';

// GET /api/disbursement-batch?search=&slot=slot_1&exportType=cbl&status=draft
//   &batchDateFrom=&batchDateTo=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class DisbursementBatchQueryDto extends createZodDto(
  disbursementBatchQuerySchema,
) {}
