import { PartialType } from '@nestjs/mapped-types';

import { CreateInvestorDto } from './create-investor.dto';

// All properties from CreateInvestorDto become optional.
//
// Example:
// PATCH /api/admin/investor/:id
//
// {
//   "fullName": "Updated Name"
// }
//
// You don't need to send phoneNumber, email, etc.

export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {}