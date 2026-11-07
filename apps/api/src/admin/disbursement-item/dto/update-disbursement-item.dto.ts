import { createZodDto } from 'nestjs-zod';
import { disbursementItemRemarkUpdateInputSchema } from '@investment-platform/contracts/disbursementItem';

// PATCH /api/admin/disbursement-item/:id
// Only `remarks` is editable after creation; send null/empty to clear it.
export class UpdateDisbursementItemDto extends createZodDto(
  disbursementItemRemarkUpdateInputSchema,
) {}
