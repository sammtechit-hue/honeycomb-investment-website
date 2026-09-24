import { createZodDto } from 'nestjs-zod';
import { investmentDocumentUpdateInputSchema } from '@investment-platform/contracts/investmentDocument';

// PATCH /api/admin/investment-document/:id
// Every document slot is optional, e.g. recording a handover as it happens:
// { "certificate": "https://cdn.example.com/investments/certificate.pdf" }
//
// `investmentId` is not accepted — the bundle is 1:1 with its investment.
export class UpdateInvestmentDocumentDto extends createZodDto(
  investmentDocumentUpdateInputSchema,
) {}
