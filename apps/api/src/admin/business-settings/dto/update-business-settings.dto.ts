import { createZodDto } from 'nestjs-zod';
import { businessSettingsUpdateInputSchema } from '@investment-platform/contracts/business-settings';

// PATCH /api/admin/business-settings/:id - only the fields provided in the
// request will be updated (rate, setcycleday, countingStartAfterDays, label, isActive).
// See packages/contracts/src/business-settings.ts for the shared source of truth.
export class UpdateBusinessSettingsDto extends createZodDto(
    businessSettingsUpdateInputSchema,
) { }
