import { createZodDto } from 'nestjs-zod';
import { investmentCreateInputSchema } from '@investment-platform/contracts/investment';

// Validated against the same schema secure-web uses for the investment form.
// See packages/contracts/src/investment.ts for the shared source of truth.
export class CreateInvestmentDto extends createZodDto(investmentCreateInputSchema) {}
