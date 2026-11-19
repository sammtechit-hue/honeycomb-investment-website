import { createZodDto } from 'nestjs-zod';
import { referralCodeUpdateInputSchema } from '@investment-platform/contracts/referralCode';

export class UpdateReferralCodeDto extends createZodDto(
  referralCodeUpdateInputSchema,
) {}
