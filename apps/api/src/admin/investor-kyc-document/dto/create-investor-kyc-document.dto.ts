import { createZodDto } from 'nestjs-zod';
import { investorKycDocumentCreateInputSchema } from '@investment-platform/contracts/investorKycDocument';

// POST /api/admin/investor-kyc-document — validated against the shared contract.
// See packages/contracts/src/investorKycDocument.ts for the source of truth.
//
// Example:
// {
//   "investorId": "1a2b3c4d-5e6f-4a5b-8c9d-0e1f2a3b4c5d",
//   "nidFront": "https://cdn.example.com/kyc/nid-front.jpg",
//   "nidBack": "https://cdn.example.com/kyc/nid-back.jpg",
//   "photo": "https://cdn.example.com/kyc/photo.jpg",
//   "verificationStatus": "pending" // optional, defaults to "pending"
// }
export class CreateInvestorKycDocumentDto extends createZodDto(
  investorKycDocumentCreateInputSchema,
) {}
