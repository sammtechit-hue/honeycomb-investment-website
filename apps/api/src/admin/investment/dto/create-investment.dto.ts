import { createZodDto } from 'nestjs-zod';
import { investmentAdminCreateInputSchema } from '@investment-platform/contracts/investment';

// POST /api/admin/investment — admin creates an investment row on behalf of an
// investor, so `investorId` is required. See
// packages/contracts/src/investment.ts for the shared source of truth.
export class CreateInvestmentDto extends createZodDto(
  investmentAdminCreateInputSchema,
) {}
