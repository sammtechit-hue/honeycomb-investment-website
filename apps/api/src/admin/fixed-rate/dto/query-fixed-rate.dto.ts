import { createZodDto } from 'nestjs-zod';
import { fixedRateQuerySchema } from '@investment-platform/contracts/fixed-rate';

// GET /api/admin/fixed-rate?search=&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// See packages/contracts/src/fixedRate.ts for the shared source of truth.
export class FixedRateQueryDto extends createZodDto(fixedRateQuerySchema) {}
