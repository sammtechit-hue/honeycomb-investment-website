import { createZodDto } from 'nestjs-zod';
import { fixedRateCreateInputSchema } from '@investment-platform/contracts/fixed-rate';

// POST /api/admin/fixed-rate - body { "rate": 10, "label": "Fixed Rate" }.
// See packages/contracts/src/fixedRate.ts for the shared source of truth.
export class CreateFixedRateDto extends createZodDto(
  fixedRateCreateInputSchema,
) {}
