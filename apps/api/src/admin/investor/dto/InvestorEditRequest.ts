import { createZodDto } from 'nestjs-zod';
import {
  investorEditRequestQuerySchema,
  investorEditRequestReviewSchema,
} from '@investment-platform/contracts/investorEditRequest';

// GET /api/admin/investor/edit-requests?search=&status=PENDING&investorId=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// Schema lives in packages/contracts/src/investorEditRequest.ts.
export class InvestorEditRequestQueryDto extends createZodDto(
  investorEditRequestQuerySchema,
) {}

// PATCH /api/admin/investor/edit-requests/:id — body { status: APPROVED | REJECTED, rejectionReason? }
// APPROVED merges the request's staged Editable* rows into the live records;
// REJECTED requires a rejectionReason. reviewedBy/reviewedAt come from the
// admin session, not the body. Schema lives in
// packages/contracts/src/investorEditRequest.ts.
export class InvestorEditRequestReviewDto extends createZodDto(
  investorEditRequestReviewSchema,
) {}
