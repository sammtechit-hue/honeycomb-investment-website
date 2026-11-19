import { createZodDto } from 'nestjs-zod';
import { addItemsToBatchInput } from '@investment-platform/contracts/disbursementItem';

// Attach already-created disbursement items to a draft disbursement batch.
// Contract: packages/contracts/src/disbursementItem.ts (addItemsToBatchInpu).
export class AddItemsToBatchDto extends createZodDto(addItemsToBatchInput) {}
