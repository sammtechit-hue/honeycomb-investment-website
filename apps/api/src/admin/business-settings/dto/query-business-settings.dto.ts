import { createZodDto } from 'nestjs-zod';
import { businessSettingsQuerySchema } from '@investment-platform/contracts/business-settings';

// GET /api/admin/business-settings?search=&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// See packages/contracts/src/business-settings.ts for the shared source of truth.
export class BusinessSettingsQueryDto extends createZodDto(
    businessSettingsQuerySchema,
) { }
