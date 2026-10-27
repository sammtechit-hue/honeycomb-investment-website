import { createZodDto } from 'nestjs-zod';
import { investorEditRequestQuerySchema } from '@investment-platform/contracts/investorEditRequest';

// GET /api/admin/investor/edit-requests?search=&status=PENDING&investorId=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// Schema lives in packages/contracts/src/investorEditRequest.ts.
export class InvestorEditRequestQueryDto extends createZodDto(
  investorEditRequestQuerySchema,
) {}
