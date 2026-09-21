import { createZodDto } from 'nestjs-zod';
import { auditLogCreateInputSchema } from '@investment-platform/contracts/auditLog';

// POST /api/audit-log — validated against the shared contract.
// See packages/contracts/src/auditLog.ts for the source of truth.
// (The previous version of this file validated an `email` field that does not
// exist on the Prisma model — replaced with the real contract.)
export class CreateAuditLogDto extends createZodDto(
  auditLogCreateInputSchema,
) {}
