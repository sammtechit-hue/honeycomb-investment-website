import { createZodDto } from 'nestjs-zod';
import { adminUpdateInputSchema } from '@investment-platform/contracts/admin';

// PATCH /api/admin/:id
// Every field is optional, e.g.:
// { "department": "Compliance" }
//
// `password` is not accepted here — credential changes need a dedicated,
// re-authenticated flow (see packages/contracts/src/admin.ts).
export class UpdateAdminDto extends createZodDto(adminUpdateInputSchema) {}
