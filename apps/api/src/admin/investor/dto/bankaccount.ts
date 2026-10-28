import { createZodDto } from 'nestjs-zod';
import { investorBankAccountQuerySchema } from '@investment-platform/contracts/investorBankAccount';

// GET /api/admin/investor/:id/bank-account?search=&selectedBank=&accountType=&isActive=&page=1&limit=10&sortBy=bankName&sortOrder=desc
// The investor ID is supplied by the route path and cannot be overridden by query parameters.
export class BankAccountQueryDto extends createZodDto(
  investorBankAccountQuerySchema.omit({ investorId: true }),
) {}
