import { createZodDto } from 'nestjs-zod';
import { changePasswordInputSchema } from '@investment-platform/contracts/auth';

export class ChangePasswordDto extends createZodDto(changePasswordInputSchema) {}
