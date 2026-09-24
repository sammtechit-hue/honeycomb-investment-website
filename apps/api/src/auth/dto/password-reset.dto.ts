import { createZodDto } from 'nestjs-zod';
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
} from '@investment-platform/contracts/auth';

export class ForgotPasswordDto extends createZodDto(forgotPasswordInputSchema) {}

export class ResetPasswordDto extends createZodDto(resetPasswordInputSchema) {}
