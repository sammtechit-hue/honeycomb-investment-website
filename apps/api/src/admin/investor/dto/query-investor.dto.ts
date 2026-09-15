import { createZodDto } from 'nestjs-zod';
import { investorQuerySchema } from '@investment-platform/contracts/investor';

// GET /api/admin/investor?search=&status=&category=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class InvestorQueryDto extends createZodDto(investorQuerySchema) {}
