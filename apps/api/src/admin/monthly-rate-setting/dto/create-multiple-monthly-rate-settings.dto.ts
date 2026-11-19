import { createZodDto } from 'nestjs-zod';
import { monthlyRateSettingsMultipleProject } from '@investment-platform/contracts/monthlyRateSetting';

// POST /api/admin/monthly-rate-setting/bulk
// body { "projectIds": ["<uuid>", ...], "month": "January", "year": 2026, "rate": 5.5 }.
// Projects that already have a setting for the month are skipped.
// See packages/contracts/src/monthlyRateSetting.ts for the shared source of truth.
export class CreateMultipleMonthlyRateSettingsDto extends createZodDto(
  monthlyRateSettingsMultipleProject,
) {}
