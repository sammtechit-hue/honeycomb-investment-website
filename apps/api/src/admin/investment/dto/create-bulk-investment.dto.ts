import { createZodDto } from 'nestjs-zod';
import { bulkInvestmentCreateRequestSchema } from '@investment-platform/contracts/investment-bulk-create';

// POST /api/admin/investment/bulk — body { "rows": [{ rowNumber, investorId,
// projectId, ... }] }. All or nothing: every row is validated before anything
// is written, and one bad row rejects the whole batch.
// See packages/contracts/src/investment-bulk-create.ts.
export class CreateBulkInvestmentDto extends createZodDto(
  bulkInvestmentCreateRequestSchema,
) {}
