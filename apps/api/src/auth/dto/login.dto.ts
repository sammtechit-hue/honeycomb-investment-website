import { createZodDto } from 'nestjs-zod';
import { loginInputSchema } from '@investment-platform/contracts/auth';

// Same schema secure-web's login form validates with — see
// packages/contracts/src/auth.ts.
export class LoginDto extends createZodDto(loginInputSchema) {}
