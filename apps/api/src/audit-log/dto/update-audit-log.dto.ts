import { createZodDto } from 'nestjs-zod';
import { auditLogUpdateInputSchema } from '@investment-platform/contracts/auditLog';

// PATCH /api/audit-log/:id — corrections only (details/admin fields).
// `action`, `targetTable` and `targetId` are intentionally not updatable —
// see packages/contracts/src/auditLog.ts.
export class UpdateAuditLogDto extends createZodDto(
  auditLogUpdateInputSchema,
) {}
