import { createZodDto } from 'nestjs-zod';
import { investorUpdateInputSchema } from '@investment-platform/contracts/investor';

// PATCH /api/admin/investor/:id — all profile fields optional.
// See packages/contracts/src/investor.ts for the shared source of truth.
export class UpdateInvestorDto extends createZodDto(investorUpdateInputSchema) {}
