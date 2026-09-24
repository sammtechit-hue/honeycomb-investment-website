import { createZodDto } from 'nestjs-zod';
import { projectUpdateInputSchema } from '@investment-platform/contracts/project';

// PATCH /api/admin/project/:id — all project fields optional.
// See packages/contracts/src/project.ts for the shared source of truth.
export class UpdateProjectDto extends createZodDto(projectUpdateInputSchema) {}

