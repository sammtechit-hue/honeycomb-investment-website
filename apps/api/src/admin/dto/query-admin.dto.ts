import { createZodDto } from 'nestjs-zod';
import { adminQuerySchema } from '@investment-platform/contracts/admin';

// GET /api/admin?search=rakib&role=ADMIN&department=Operations
//   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class AdminQueryDto extends createZodDto(adminQuerySchema) {}
