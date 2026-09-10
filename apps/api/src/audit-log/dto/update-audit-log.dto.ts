import { PartialType } from '@nestjs/mapped-types';

import { CreateAuditLogDto } from './create-audit-log.dto';

// All properties from CreateAuditLogDto become optional.
//
// Example:
// PATCH /api/audit-log/:id
//
// {
//   "fullName": "Updated Name"
// }
//
// You don't need to send phoneNumber, email, etc.

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {}
