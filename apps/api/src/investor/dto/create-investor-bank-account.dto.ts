import { createZodDto } from 'nestjs-zod';
import { bankAccountSchema } from '@investment-platform/contracts/investor';

// POST /api/investor/bank-account — the authenticated investor determines
// ownership, and new accounts are created inactive for admin review.
export class CreateInvestorBankAccountDto extends createZodDto(bankAccountSchema) {}
