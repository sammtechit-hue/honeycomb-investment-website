import { createZodDto } from 'nestjs-zod';
import { projectCreateInputSchema } from '@investment-platform/contracts/project';

// POST /api/admin/project — validated against the shared source of truth.
// See packages/contracts/src/project.ts for the schema.
export class CreateProjectDto extends createZodDto(projectCreateInputSchema) {}

