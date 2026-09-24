import { createZodDto } from 'nestjs-zod';
import { roiCalculatorLeadUpdateSchema } from '@investment-platform/contracts/roi-calculator-lead';

// PATCH /api/admin/roi-calculator-lead/:id - admin follow-up tracking.
// See packages/contracts/src/roiCalculatorLead.ts for the shared source of truth.
export class UpdateRoiCalculatorLeadDto extends createZodDto(
  roiCalculatorLeadUpdateSchema,
) {}
