import { createZodDto } from 'nestjs-zod';
import { auditLogUpdateInputSchema } from '@investment-platform/contracts/auditLog';

// PATCH /api/admin/audit-log/:id — corrections only (details/admin fields).
// `action`, `targetTable` and `targetId` are intentionally not updatable —
// see packages/contracts/src/auditLog.ts.
//
// Example:
// PATCH /api/admin/audit-log/:id
// {
//   "details": { "verifiedBy": "moderator-1", "docs": 4 }
// }
export class UpdateAuditLogDto extends createZodDto(
  auditLogUpdateInputSchema,
) {}
