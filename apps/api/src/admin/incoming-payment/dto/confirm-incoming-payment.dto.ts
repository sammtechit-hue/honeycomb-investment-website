import { createZodDto } from 'nestjs-zod';
import { incomingPaymentConfirmSchema } from '@investment-platform/contracts/incomingPayment';

// POST /api/admin/incoming-payment/confirm — admin confirms/rejects a payment.
// The body's id must match the :id route param.
export class ConfirmIncomingPaymentDto extends createZodDto(
  incomingPaymentConfirmSchema,
) {}
