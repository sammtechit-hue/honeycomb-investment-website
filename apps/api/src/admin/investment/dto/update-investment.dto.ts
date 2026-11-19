import { createZodDto } from 'nestjs-zod';
import { investmentAdminUpdateInputSchema } from '@investment-platform/contracts/investment';

// PATCH /api/admin/investment/:id — all fields optional (see
// packages/contracts/src/investment.ts). Admins may additionally update
// status, agreement fields and physical-items tracking flags.
export class UpdateInvestmentDto extends createZodDto(
  investmentAdminUpdateInputSchema,
) {}

