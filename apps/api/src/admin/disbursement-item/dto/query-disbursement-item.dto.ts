import { createZodDto } from 'nestjs-zod';
import { disbursementItemQuerySchema } from '@investment-platform/contracts/disbursementItem';

// GET /api/admin/disbursement-item?search=ROI&batchId=&investmentId=&investorId=
//   &exportFormat=cbl&minAmount=&maxAmount=&page=1&limit=10&sortBy=amount&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class DisbursementItemQueryDto extends createZodDto(
  disbursementItemQuerySchema,
) {}
