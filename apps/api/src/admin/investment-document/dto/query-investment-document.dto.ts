import { createZodDto } from 'nestjs-zod';
import { investmentDocumentQuerySchema } from '@investment-platform/contracts/investmentDocument';

// GET /api/admin/investment-document?search=deed&investmentId=
//   &hasDocument=certificate&uploadedFrom=&uploadedTo=
//   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
//
// `hasDocument=<kind>` is the useful one here: it lists only the investments
// that already have that document, so the inverse (what is still missing) can
// be found per document kind.
export class InvestmentDocumentQueryDto extends createZodDto(
  investmentDocumentQuerySchema,
) {}
