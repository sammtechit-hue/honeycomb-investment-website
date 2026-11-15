import { createZodDto } from 'nestjs-zod';
import { referralQuerySchema } from '@investment-platform/contracts/referral';


export class ReferralQueryDto extends createZodDto(referralQuerySchema) {}
