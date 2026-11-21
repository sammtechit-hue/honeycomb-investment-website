import { createZodDto } from 'nestjs-zod';
import { investorApplicationRejectInputSchema } from '@investment-platform/contracts/investor';

// PATCH /api/admin/investor/:id/reject — the reason is shown to the investor.
export class RejectApplicationDto extends createZodDto(
  investorApplicationRejectInputSchema,
) {}
