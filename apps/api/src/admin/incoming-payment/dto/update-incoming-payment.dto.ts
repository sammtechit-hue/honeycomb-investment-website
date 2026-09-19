import { createZodDto } from 'nestjs-zod';
import { incomingPaymentUpdateSchema } from '@investment-platform/contracts/incomingPayment';

// PATCH /api/admin/incoming-payment/:id — all fields optional (see
// packages/contracts/src/incomingPayment.ts).
export class UpdateIncomingPaymentDto extends createZodDto(
  incomingPaymentUpdateSchema,
) {}
