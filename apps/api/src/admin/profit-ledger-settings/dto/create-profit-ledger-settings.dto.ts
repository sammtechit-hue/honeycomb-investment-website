import { createZodDto } from 'nestjs-zod';
import { profitLedgerSettingsCreateInputSchema } from '@investment-platform/contracts/profit-ledger-settings';

// POST /api/admin/profit-ledger-settings - body { "setcycleday": 10, "label": "..." }.
// See packages/contracts/src/profitLedgerSettings.ts for the shared source of truth.
export class CreateProfitLedgerSettingsDto extends createZodDto(
    profitLedgerSettingsCreateInputSchema,
) { }
