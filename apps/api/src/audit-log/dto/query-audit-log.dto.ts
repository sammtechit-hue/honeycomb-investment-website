import { createZodDto } from 'nestjs-zod';
import { auditLogQuerySchema } from '@investment-platform/contracts/auditLog';

// GET /api/audit-log?search=verified&action=verified_kyc&targetTable=investors
//   &createdFrom=&createdTo=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class AuditLogQueryDto extends createZodDto(auditLogQuerySchema) {}
