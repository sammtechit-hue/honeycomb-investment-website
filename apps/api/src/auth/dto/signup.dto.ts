import { createZodDto } from 'nestjs-zod';
import { signupInputSchema } from '@investment-platform/contracts/auth';

export class SignupDto extends createZodDto(signupInputSchema) {}
