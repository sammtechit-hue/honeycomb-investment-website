import { createZodDto } from 'nestjs-zod';
import { disbursementItemRemarkUpdateInputSchema } from '@investment-platform/contracts/disbursementItem';


export class UpdateDisbursementItemDto extends createZodDto(
  disbursementItemRemarkUpdateInputSchema,
) {}
