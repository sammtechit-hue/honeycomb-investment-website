import { createZodDto } from 'nestjs-zod';
import { monthlyProfitLedgerQuerySchema } from '@investment-platform/contracts/monthlyProfitLedger';

// GET /api/monthly-profit-ledger?investmentId=&payoutStatus=accrued&min=&max=
//   &periodFrom=&periodTo=&page=1&limit=10&sortBy=periodMonth&sortOrder=desc
// The caller is always scoped to the logged-in investor, so the schema's
// admin-only `investorId` filter is ignored in the service.
// Query string validated by ZodValidationPipe via @Query() decorator.
export class MonthlyProfitLedgerQueryDto extends createZodDto(
  monthlyProfitLedgerQuerySchema,
) {}
