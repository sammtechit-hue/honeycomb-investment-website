import { createZodDto } from 'nestjs-zod';
import { fixedRateUpdateInputSchema } from '@investment-platform/contracts/fixed-rate';

// PATCH /api/admin/fixed-rate/:id - partial update.
// See packages/contracts/src/fixedRate.ts for the shared source of truth.
export class UpdateFixedRateDto extends createZodDto(
  fixedRateUpdateInputSchema,
) {}
