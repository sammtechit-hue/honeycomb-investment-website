import { createZodDto } from 'nestjs-zod';
import { monthlyRateSettingCreateInputSchema } from '@investment-platform/contracts/monthlyRateSetting';

// POST /api/admin/monthly-rate-setting - body { "month": "January", "year": 2026, "rate": 5.5 }.
// See packages/contracts/src/monthlyRateSetting.ts for the shared source of truth.
export class CreateMonthlyRateSettingDto extends createZodDto(
  monthlyRateSettingCreateInputSchema,
) {}
