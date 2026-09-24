import { createZodDto } from 'nestjs-zod';
import { investorBankAccountCreateInputSchema } from '@investment-platform/contracts/investorBankAccount';

// POST /api/investor-bank-account — validated against the shared contract.
// See packages/contracts/src/investorBankAccount.ts for the source of truth.
//
// Example:
// {
//   "investorId": "1a2b3c4d-5e6f-4a5b-8c9d-0e1f2a3b4c5d",
//   "selectedBank": "city_bank",
//   "bankName": "City Bank",
//   "accountName": "Rakib Hasan",
//   "accountNumber": "1234567890",
//   "accountType": "savings",          // optional
//   "branchName": "Gulshan",           // optional
//   "routingNumber": "123456789",      // required unless selectedBank is city_bank
//   "isActive": false                  // optional, defaults to false
// }
export class CreateInvestorBankAccountDto extends createZodDto(
  investorBankAccountCreateInputSchema,
) {}
