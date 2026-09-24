import { createZodDto } from 'nestjs-zod';
import { investmentDocumentCreateInputSchema } from '@investment-platform/contracts/investmentDocument';

// POST /api/investment-document — validated against the shared contract.
// See packages/contracts/src/investmentDocument.ts for the source of truth.
//
// Every slot is optional, but at least one is required (an empty bundle is not
// a document row). Example:
// {
//   "investmentId": "1a2b3c4d-5e6f-4a5b-8c9d-0e1f2a3b4c5d",
//   "online_deed": "https://cdn.example.com/investments/deed.pdf",
//   "certificate": "https://cdn.example.com/investments/certificate.pdf"
// }
export class CreateInvestmentDocumentDto extends createZodDto(
  investmentDocumentCreateInputSchema,
) {}
