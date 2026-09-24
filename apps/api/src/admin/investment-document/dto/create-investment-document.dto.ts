import { createZodDto } from 'nestjs-zod';
import { investmentDocumentCreateInputSchema } from '@investment-platform/contracts/investmentDocument';

// POST /api/admin/investment-document — validated against the shared contract.
// See packages/contracts/src/investmentDocument.ts for the source of truth.
//
// At least one document slot is required. Example:
// {
//   "investmentId": "1a2b3c4d-5e6f-4a5b-8c9d-0e1f2a3b4c5d",
//   "online_deed": "https://cdn.example.com/investments/deed.pdf",
//   "cheque": "https://cdn.example.com/investments/cheque.jpg",
//   "cash_voucher": "https://cdn.example.com/investments/voucher.jpg"
// }
export class CreateInvestmentDocumentDto extends createZodDto(
  investmentDocumentCreateInputSchema,
) {}
