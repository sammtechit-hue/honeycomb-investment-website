import { createZodDto } from 'nestjs-zod';
import { bulkInvestorImportRequestSchema } from '@investment-platform/contracts/investor-bulk-import';

// POST /api/admin/investor/bulk — body { "rows": [{ rowNumber, fullname, ... }] }.
// Each row may carry the optional nominee group and must carry KYC document
// URLs (nidFront, nidBack, photo). Rows are validated individually (duplicate
// email/phone/NID inside the file included) by the shared schema.
// See packages/contracts/src/investor-bulk-import.ts.
export class CreateBulkInvestorDto extends createZodDto(
  bulkInvestorImportRequestSchema,
) {}
