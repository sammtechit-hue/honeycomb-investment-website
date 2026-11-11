import { createZodDto } from 'nestjs-zod';
import { disbursementBatchUpdateInputSchema } from '@investment-platform/contracts/disbursementBatch';


export class UpdateDisbursementBatchDto extends createZodDto(
  disbursementBatchUpdateInputSchema,
) {}
