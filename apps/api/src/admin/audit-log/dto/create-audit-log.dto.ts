import { createZodDto } from 'nestjs-zod';
import { auditLogCreateInputSchema } from '@investment-platform/contracts/auditLog';

// POST /api/admin/audit-log — validated against the shared contract.
// See packages/contracts/src/auditLog.ts for the source of truth.
//
// Example:
// {
//   "action": "verified_kyc",
//   "targetTable": "investors",
//   "targetId": "1a2b3c4d-5e6f-4a5b-8c9d-0e1f2a3b4c5d",
//   "details": { "verifiedBy": "moderator-1", "docs": 3 },  // optional JSON
//   "adminProfileId": "9b8a7c6d-5e4f-4a3b-2c1d-0f9e8d7c6b5a", // optional
//   "adminName": "Rakib Hasan"                                // optional
// }
export class CreateAuditLogDto extends createZodDto(
  auditLogCreateInputSchema,
) {}
