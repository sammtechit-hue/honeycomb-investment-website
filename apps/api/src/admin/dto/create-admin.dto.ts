import { createZodDto } from 'nestjs-zod';
import { adminCreateInputSchema } from '@investment-platform/contracts/admin';

// POST /api/admin — creates the `User` (credentials) and its 1:1
// `AdminProfile` together. Validated against the shared contract; see
// packages/contracts/src/admin.ts for the source of truth.
//
// Example:
// {
//   "name": "Rakib Hasan",
//   "email": "rakib@example.com",
//   "phone": "01712345678",                    // optional
//   "role": "ADMIN",                           // optional, defaults to ADMIN
//   "department": "Operations",                // optional
//   "allowedIpRange": "203.0.113.0/24",        // optional
//   "password": "Str0ngPassphrase"             // hashed into User.passwordHash
// }
export class CreateAdminDto extends createZodDto(adminCreateInputSchema) {}
