import { createZodDto } from 'nestjs-zod';
import { investorAdminUpdateInputSchema } from '@investment-platform/contracts/investor';

// PATCH /api/admin/investor/:id — every investor field is optional.
// See packages/contracts/src/investor.ts (investorAdminUpdateInputSchema).
export class UpdateInvestorDto extends createZodDto(investorAdminUpdateInputSchema) {}
