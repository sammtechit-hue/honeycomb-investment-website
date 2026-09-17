import { createZodDto } from 'nestjs-zod';
import { incomingPaymentCreateSchema } from '@investment-platform/contracts/incomingPayment';

// POST /api/admin/incoming-payment — validated against the shared contract.
// See packages/contracts/src/incomingPayment.ts for the source of truth.
export class CreateIncomingPaymentDto extends createZodDto(
  incomingPaymentCreateSchema,
) {}
