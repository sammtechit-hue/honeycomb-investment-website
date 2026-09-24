import { createZodDto } from 'nestjs-zod';
import { disbursementItemCreateInputSchema } from '@investment-platform/contracts/disbursementItem';

// POST /api/disbursement-item — validated against the shared contract.
// See packages/contracts/src/disbursementItem.ts for the source of truth.
export class CreateDisbursementItemDto extends createZodDto(
  disbursementItemCreateInputSchema,
) {}
