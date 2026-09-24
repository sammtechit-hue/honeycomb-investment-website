import { createZodDto } from 'nestjs-zod';
import { roiCalculatorLeadQuerySchema } from '@investment-platform/contracts/roi-calculator-lead';

// GET /api/roi-calculator-lead?search=john&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class RoiCalculatorLeadQueryDto extends createZodDto(
  roiCalculatorLeadQuerySchema,
) {}
