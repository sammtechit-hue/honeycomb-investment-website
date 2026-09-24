import { createZodDto } from 'nestjs-zod';
import { investorKycDocumentQuerySchema } from '@investment-platform/contracts/investorKycDocument';

// GET /api/admin/investor-kyc-document?search=nid&investorId=
//   &verificationStatus=pending&uploadedFrom=&uploadedTo=
//   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class InvestorKycDocumentQueryDto extends createZodDto(
  investorKycDocumentQuerySchema,
) {}
