import { createZodDto } from 'nestjs-zod';
import { payoutWindowUpdateInputSchema } from '@investment-platform/contracts/payoutWindow';

// PATCH /api/admin/payout-window/:id — all fields optional
export class UpdatePayoutWindowDto extends createZodDto(
  payoutWindowUpdateInputSchema
) {}