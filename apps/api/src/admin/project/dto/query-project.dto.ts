import { createZodDto } from 'nestjs-zod';
import { projectQuerySchema } from '@investment-platform/contracts/project';

// GET /api/admin/project?search=&status=OPEN&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class ProjectQueryDto extends createZodDto(projectQuerySchema) {}
