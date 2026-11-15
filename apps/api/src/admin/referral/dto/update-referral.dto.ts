import { createZodDto } from 'nestjs-zod';
import { referralUpdateInputSchema } from '@investment-platform/contracts/referral';


export class UpdateReferralDto extends createZodDto(referralUpdateInputSchema) {}
