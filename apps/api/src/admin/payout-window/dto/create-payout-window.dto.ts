import { createZodDto } from 'nestjs-zod';
import { payoutWindowCreateInputSchema } from '@investment-platform/contracts/payoutWindow';


export class CreatePayoutWindowDto extends createZodDto(
  payoutWindowCreateInputSchema,
) {}
