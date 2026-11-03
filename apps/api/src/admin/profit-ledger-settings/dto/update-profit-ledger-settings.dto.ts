import { createZodDto } from 'nestjs-zod';
import { profitLedgerSettingsUpdateInputSchema } from '@investment-platform/contracts/profit-ledger-settings';

// PATCH /api/admin/profit-ledger-settings/:id - partial update.
// See packages/contracts/src/profitLedgerSettings.ts for the shared source of truth.
export class UpdateProfitLedgerSettingsDto extends createZodDto(
    profitLedgerSettingsUpdateInputSchema,
) { }
