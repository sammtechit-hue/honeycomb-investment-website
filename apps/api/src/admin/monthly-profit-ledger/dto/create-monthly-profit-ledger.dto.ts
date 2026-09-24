import { createZodDto } from 'nestjs-zod';
import { monthlyProfitLedgerCreateInputSchema } from '@investment-platform/contracts/monthlyProfitLedger';

// POST /api/admin/monthly-profit-ledger — validated against the shared contract.
// See packages/contracts/src/monthlyProfitLedger.ts for the source of truth.
//
// Example:
// {
//   "investmentId": "8a4b9c2e-3d5f-4a6b-8c9d-0e1f2a3b4c5d",
//   "periodMonth": "2026-09-01",
//   "rateApplied": 10.50,
//   "profitAmount": 5250.00
//   // payoutStatus defaults to "accrued"; disbursementItemId optional
// }
export class CreateMonthlyProfitLedgerDto extends createZodDto(
  monthlyProfitLedgerCreateInputSchema,
) {}
