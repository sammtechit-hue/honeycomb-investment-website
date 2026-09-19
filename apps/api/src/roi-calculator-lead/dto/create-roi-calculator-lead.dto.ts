import { createZodDto } from 'nestjs-zod';
import { roiCalculatorLeadCreateSchema } from '@investment-platform/contracts/roi-calculator-lead';

// Validated against the same schema secure-web uses for the ROI
// calculator lead form. See packages/contracts/src/roiCalculatorLead.ts
// for the shared source of truth.
export class CreateRoiCalculatorLeadDto extends createZodDto(
  roiCalculatorLeadCreateSchema,
) {}
