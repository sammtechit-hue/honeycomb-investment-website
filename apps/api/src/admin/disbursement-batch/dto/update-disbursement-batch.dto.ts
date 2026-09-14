import { PartialType } from '@nestjs/mapped-types';

import { CreateDisbursementBatchDto } from './create-disbursement-batch.dto';

// All properties from CreateDisbursementBatchDto become optional.
//
// Example:
// PATCH /api/admin/disbursement-batch/:id
//
// {
//   "status": "exported"
// }
//
// You don't need to send slot, batchDate, etc.

export class UpdateDisbursementBatchDto extends PartialType(CreateDisbursementBatchDto) {}
