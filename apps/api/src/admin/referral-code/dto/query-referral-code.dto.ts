import { createZodDto } from 'nestjs-zod';
import { referralCodeQuerySchema } from '@investment-platform/contracts/referralCode';

export class ReferralCodeQueryDto extends createZodDto(
  referralCodeQuerySchema,
) {}
