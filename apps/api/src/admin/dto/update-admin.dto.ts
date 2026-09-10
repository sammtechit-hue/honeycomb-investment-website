import { PartialType } from '@nestjs/mapped-types';

import { CreateAdminDto } from './create-admin.dto';

// All properties from CreateAdminDto become optional.
//
// Example:
// PATCH /api/admin/:id
//
// {
//   "fullName": "Updated Name"
// }
//
// You don't need to send phoneNumber, email, etc.

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}
