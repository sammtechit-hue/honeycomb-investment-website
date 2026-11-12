import { createZodDto } from 'nestjs-zod';
import { referralCodeUpdateInputSchema } from '@investment-platform/contracts/referralCode';

export class UpdateRefferalCodeDto extends createZodDto(
  referralCodeUpdateInputSchema,
) {}
