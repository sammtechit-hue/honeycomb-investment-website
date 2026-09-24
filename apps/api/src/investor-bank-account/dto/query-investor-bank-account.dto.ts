import { createZodDto } from 'nestjs-zod';
import { investorBankAccountQuerySchema } from '@investment-platform/contracts/investorBankAccount';

// GET /api/investor-bank-account?search=city&investorId=&selectedBank=city_bank
//   &accountType=savings&isActive=true&page=1&limit=10&sortBy=bankName&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class InvestorBankAccountQueryDto extends createZodDto(
  investorBankAccountQuerySchema,
) {}
