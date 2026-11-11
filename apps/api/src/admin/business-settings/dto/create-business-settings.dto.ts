import { createZodDto } from 'nestjs-zod';
import { businessSettingsCreateInputSchema } from '@investment-platform/contracts/business-settings';

// POST /api/admin/business-settings - body { "rate": 10, "setcycleday": 10, "countingStartAfterDays": 3, "label": "..." }.
// See packages/contracts/src/business-settings.ts for the shared source of truth.
export class CreateBusinessSettingsDto extends createZodDto(
    businessSettingsCreateInputSchema,
) { }
