import { createZodDto } from 'nestjs-zod';
import { investorBankAccountUpdateInputSchema } from '@investment-platform/contracts/investorBankAccount';

// PATCH /api/investor-bank-account/:id
// Every field is optional, e.g. switching which account receives payouts:
// { "isActive": true }
//
// `investorId` is not accepted (re-pointing an account would redirect payouts),
// and switching `selectedBank` to a non-City-Bank account requires the routing
// number in the same request.
export class UpdateInvestorBankAccountDto extends createZodDto(
  investorBankAccountUpdateInputSchema,
) {}
