import { createZodDto } from 'nestjs-zod';
import { referralQuerySchema } from '@investment-platform/contracts/referral';

// GET /api/referral?search=ABC123&referrerId=&referredInvestorId=&referralCodeId=
//   &minBonusAmount=&maxBonusAmount=&fromDate=&toDate=
//   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class ReferralQueryDto extends createZodDto(referralQuerySchema) {}
