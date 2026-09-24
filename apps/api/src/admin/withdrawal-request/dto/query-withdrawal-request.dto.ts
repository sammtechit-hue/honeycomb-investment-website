import { createZodDto } from 'nestjs-zod';
import { withdrawalRequestQuerySchema } from '@investment-platform/contracts/withdrawal-request';

// GET /api/withdrawal-request?search=&investmentId=&status=pending
//   &withdrawalMethod=auto&min=&max=&requestDateFrom=&requestDateTo=
//   &page=1&limit=10&sortBy=requestDate&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class WithdrawalRequestQueryDto extends createZodDto(
  withdrawalRequestQuerySchema,
) {}
