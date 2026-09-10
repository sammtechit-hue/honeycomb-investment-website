import { PartialType } from '@nestjs/mapped-types';

import { CreateInvestmentDto } from './create-investment.dto';

// All properties from CreateInvestmentDto become optional.
//
// Example:
// PATCH /api/investment/:id
//
// {
//   "fullName": "Updated Name"
// }
//
// You don't need to send phoneNumber, email, etc.

export class UpdateInvestmentDto extends PartialType(CreateInvestmentDto) {}
