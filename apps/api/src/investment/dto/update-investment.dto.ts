import { createZodDto } from 'nestjs-zod';
import { investmentUpdateInputSchema } from '@investment-platform/contracts/investment';

// PATCH /api/investment/:id — all fields optional (see
// packages/contracts/src/investment.ts), fixedRate still required when
// investmentType is "fixed".
export class UpdateInvestmentDto extends createZodDto(investmentUpdateInputSchema) {}
