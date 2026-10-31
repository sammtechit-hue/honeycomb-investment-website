import { createZodDto } from 'nestjs-zod';
import { monthlyRateSettingUpdateInputSchema } from '@investment-platform/contracts/monthlyRateSetting';

// PATCH /api/admin/monthly-rate-setting/:id - only the fields provided in the
// request will be updated (rate, isActive, month/year).
// See packages/contracts/src/monthlyRateSetting.ts for the shared source of truth.
export class UpdateMonthlyRateSettingDto extends createZodDto(
  monthlyRateSettingUpdateInputSchema,
) {}
