import { createZodDto } from 'nestjs-zod';
import { investorApplicationResubmitInputSchema } from '@investment-platform/contracts/investor';

// A rejected application, corrected and sent back for review.
export class ResubmitApplicationDto extends createZodDto(
  investorApplicationResubmitInputSchema,
) {}
