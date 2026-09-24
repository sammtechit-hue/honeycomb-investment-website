import { createZodDto } from 'nestjs-zod';
import { investorKycDocumentUpdateInputSchema } from '@investment-platform/contracts/investorKycDocument';

// PATCH /api/investor-kyc-document/:id
// Every field is optional; `investorId` is not accepted (the relation is 1:1),
// so a re-upload is just the document URLs that changed.
export class UpdateInvestorKycDocumentDto extends createZodDto(
  investorKycDocumentUpdateInputSchema,
) {}
