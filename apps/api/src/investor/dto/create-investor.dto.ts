import { createZodDto } from 'nestjs-zod';
import { investorApplicationInputSchema } from '@investment-platform/contracts/investor';

// The account application: profile, documents and the first investment.
// Validated against the same schema secure-web uses for the verification
// wizard (packages/contracts/src/investor.ts).
export class CreateInvestorDto extends createZodDto(investorApplicationInputSchema) {}
