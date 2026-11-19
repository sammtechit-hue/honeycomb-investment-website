import { createZodDto } from 'nestjs-zod';
import { payoutWindowQuerySchema } from '@investment-platform/contracts/payoutWindow';

// GET /api/admin/payout-window - status/date-range filters + pagination/sorting.
// See packages/contracts/src/payoutWindow.ts for the shared source of truth.
export class PayoutWindowQueryDto extends createZodDto(
  payoutWindowQuerySchema,
) {}
