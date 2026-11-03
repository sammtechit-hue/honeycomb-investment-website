import { createZodDto } from 'nestjs-zod';
import { profitLedgerSettingsQuerySchema } from '@investment-platform/contracts/profit-ledger-settings';

// GET /api/admin/profit-ledger-settings?search=&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// See packages/contracts/src/profitLedgerSettings.ts for the shared source of truth.
export class ProfitLedgerSettingsQueryDto extends createZodDto(
    profitLedgerSettingsQuerySchema,
) { }
