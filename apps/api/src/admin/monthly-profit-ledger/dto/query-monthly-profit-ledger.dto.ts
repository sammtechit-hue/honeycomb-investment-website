import { createZodDto } from 'nestjs-zod';
import { monthlyProfitLedgerQuerySchema } from '@investment-platform/contracts/monthlyProfitLedger';

// GET /api/admin/monthly-profit-ledger?search=&investmentId=&investorId=
//   &payoutStatus=accrued&min=&max=&periodFrom=&periodTo=
//   &page=1&limit=10&sortBy=periodMonth&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class MonthlyProfitLedgerQueryDto extends createZodDto(
  monthlyProfitLedgerQuerySchema,
) {}
