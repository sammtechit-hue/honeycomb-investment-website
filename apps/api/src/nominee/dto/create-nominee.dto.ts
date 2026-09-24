import { createZodDto } from 'nestjs-zod';
import { nomineeCreateInputSchema } from '@investment-platform/contracts/nominee';

// POST /api/nominee — validated against the shared contract.
// See packages/contracts/src/nominee.ts for the source of truth.
//
// Example:
// {
//   "investorId": "7c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
//   "nomineeName": "Ayesha Rahman",
//   "nomineePhone": "01712345678",
//   "relation": "Daughter",
//   "nomineeNidFront": "https://cdn.example.com/nid/front.jpg",  // optional
//   "nomineeNidBack": "https://cdn.example.com/nid/back.jpg",    // optional
//   "nomineePhoto": "https://cdn.example.com/photo.jpg"          // optional
// }
export class CreateNomineeDto extends createZodDto(
  nomineeCreateInputSchema,
) {}
