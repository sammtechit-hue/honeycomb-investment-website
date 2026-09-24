import { createZodDto } from 'nestjs-zod';
import { investmentDocumentUpdateInputSchema } from '@investment-platform/contracts/investmentDocument';

// PATCH /api/investment-document/:id
// Every document slot is optional, so a later upload is just:
// { "certificate": "https://cdn.example.com/investments/certificate.pdf" }
//
// `investmentId` is not accepted — the bundle is 1:1 with its investment.
export class UpdateInvestmentDocumentDto extends createZodDto(
  investmentDocumentUpdateInputSchema,
) {}
