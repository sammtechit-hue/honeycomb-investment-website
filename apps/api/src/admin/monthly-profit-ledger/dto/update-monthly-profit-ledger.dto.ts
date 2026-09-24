import { createZodDto } from 'nestjs-zod';
import { monthlyProfitLedgerUpdateInputSchema } from '@investment-platform/contracts/monthlyProfitLedger';

// PATCH /api/admin/monthly-profit-ledger/:id — all fields optional
// (see packages/contracts/src/monthlyProfitLedger.ts).
//
// Example (mark a month's profit as paid out):
// PATCH /api/admin/monthly-profit-ledger/:id
// {
//   "payoutStatus": "disbursed",
//   "disbursementItemId": "1f2e3d4c-5b6a-7988-9a0b-1c2d3e4f5a6b"
// }
export class UpdateMonthlyProfitLedgerDto extends createZodDto(
  monthlyProfitLedgerUpdateInputSchema,
) {}
