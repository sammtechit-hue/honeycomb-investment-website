import { PartialType } from '@nestjs/mapped-types';

import { CreateProjectDto } from './create-project.dto';

// All properties from CreateProjectDto become optional.
//
// Example:
// PATCH /api/project/:id
//
// {
//   "title": "Updated Project Title"
// }
//
// You don't need to send description, location, etc.

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
