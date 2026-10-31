import { createZodDto } from 'nestjs-zod';
import { monthlyRateSettingQuerySchema } from '@investment-platform/contracts/monthlyRateSetting';

// GET /api/admin/monthly-rate-setting?search=&status=active|inactive&page=1&limit=10&sortBy=periodMonth&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// See packages/contracts/src/monthlyRateSetting.ts for the shared source of truth.
export class MonthlyRateSettingQueryDto extends createZodDto(
  monthlyRateSettingQuerySchema,
) {}
