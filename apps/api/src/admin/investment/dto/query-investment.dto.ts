import { createZodDto } from 'nestjs-zod';
import { investmentQuerySchema } from '@investment-platform/contracts/investment';

// GET /api/admin/investment?search=&status=&investmentType=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class InvestmentQueryDto extends createZodDto(investmentQuerySchema) {}
