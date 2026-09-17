import { createZodDto } from 'nestjs-zod';
import { incomingPaymentQuerySchema } from '@investment-platform/contracts/incomingPayment';

// GET /api/admin/incoming-payment?page=1&limit=20&sortBy=dueDate&sortOrder=desc&status=pending
// Query string validated by ZodValidationPipe via @Query() decorator.
export class IncomingPaymentQueryDto extends createZodDto(
  incomingPaymentQuerySchema,
) {}
