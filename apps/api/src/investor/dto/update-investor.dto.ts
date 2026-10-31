import { createZodDto } from 'nestjs-zod';
import { investorUpdateInputSchema } from '@investment-platform/contracts/investor';

// PATCH /api/investor/:id — profile, nominee, KYC and contact fields, all
// optional. Changes are staged in the Editable* tables and the profile is
// flagged `pending` until an admin applies them.
// See packages/contracts/src/investor.ts for the shared source of truth.
export class UpdateInvestorDto extends createZodDto(investorUpdateInputSchema) {}
