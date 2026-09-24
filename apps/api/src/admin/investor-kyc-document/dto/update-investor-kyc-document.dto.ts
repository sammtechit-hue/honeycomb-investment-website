import { createZodDto } from 'nestjs-zod';
import { investorKycDocumentUpdateInputSchema } from '@investment-platform/contracts/investorKycDocument';

// PATCH /api/admin/investor-kyc-document/:id
// Every field is optional; `investorId` is not accepted (the relation is 1:1).
// A review decision is just:
// { "verificationStatus": "verified" }
export class UpdateInvestorKycDocumentDto extends createZodDto(
  investorKycDocumentUpdateInputSchema,
) {}
