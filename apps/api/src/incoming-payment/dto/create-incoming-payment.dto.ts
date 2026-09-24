import { createZodDto } from 'nestjs-zod';
import { incomingPaymentCreateSchema } from '@investment-platform/contracts/incomingPayment';

// POST /api/incoming-payment — validated against the same schema secure-web
// uses for the payment submission form.
// See packages/contracts/src/incomingPayment.ts for the shared source of truth.
export class CreateIncomingPaymentDto extends createZodDto(
  incomingPaymentCreateSchema,
) {}
