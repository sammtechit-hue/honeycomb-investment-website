import { createZodDto } from 'nestjs-zod';
import { createAdminAccountInputSchema } from '@investment-platform/contracts/auth';

export class CreateAdminAccountDto extends createZodDto(
  createAdminAccountInputSchema,
) {}
