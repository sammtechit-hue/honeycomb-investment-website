import { createZodDto } from 'nestjs-zod';
import { investorUpdateInputSchema } from '@investment-platform/contracts/investor';

// PATCH /api/investor/:id — all fields from investorCreateInputSchema
// become optional (see packages/contracts/src/investor.ts).
export class UpdateInvestorDto extends createZodDto(investorUpdateInputSchema) {}
