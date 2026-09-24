import { createZodDto } from 'nestjs-zod';
import { investmentDocumentQuerySchema } from '@investment-platform/contracts/investmentDocument';

// GET /api/investment-document?search=deed&investmentId=
//   &hasDocument=certificate&uploadedFrom=&uploadedTo=
//   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class InvestmentDocumentQueryDto extends createZodDto(
  investmentDocumentQuerySchema,
) {}
