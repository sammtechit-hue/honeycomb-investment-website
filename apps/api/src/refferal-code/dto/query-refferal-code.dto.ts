import { createZodDto } from 'nestjs-zod';
import { referralCodeQuerySchema } from '@investment-platform/contracts/referralCode';

// GET /api/refferal-code?search=ABC123&referrerId=&referredId=&isUsed=false
//   &expiresAfter=&expiresBefore=&fromDate=&toDate=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class RefferalCodeQueryDto extends createZodDto(
  referralCodeQuerySchema,
) {}
