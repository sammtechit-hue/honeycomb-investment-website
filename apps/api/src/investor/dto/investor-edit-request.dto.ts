import { createZodDto } from 'nestjs-zod';
import {
  investorEditRequestQuerySchema,
} from '@investment-platform/contracts/investorEditRequest';

// GET /api/investor/edit-requests?search=&status=PENDING&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
// Schema lives in packages/contracts/src/investorEditRequest.ts.
//
// NOTE: `investorId` is part of the shared query schema but is never honored
// here — requests are always scoped to the authenticated investor's own
// record, so one investor cannot enumerate another investor's requests.
export class InvestorEditRequestQueryDto extends createZodDto(
  investorEditRequestQuerySchema,
) {}
