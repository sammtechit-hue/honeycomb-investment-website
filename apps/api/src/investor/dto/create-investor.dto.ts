import { createZodDto } from 'nestjs-zod';
import { investorCreateInputSchema } from '@investment-platform/contracts/investor';

// Validated against the same schema secure-web uses for the investor
// registration form. See packages/contracts/src/investor.ts for the shared
// source of truth.
export class CreateInvestorDto extends createZodDto(investorCreateInputSchema) {}
