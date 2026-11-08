import { createZodDto } from 'nestjs-zod';
import { payoutWindowCreateInputSchema } from '@investment-platform/contracts/payoutWindow';

// POST /api/admin/payout-window - body { periodMonth, startDate, endDate, status? }.
// See packages/contracts/src/payoutWindow.ts for the shared source of truth.
export class CreatePayoutWindowDto extends createZodDto(
  payoutWindowCreateInputSchema,
) {}
