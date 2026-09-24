import { createZodDto } from 'nestjs-zod';
import { nomineeUpdateInputSchema } from '@investment-platform/contracts/nominee';

// PATCH /api/nominee/:id — all fields optional
// (see packages/contracts/src/nominee.ts).
//
// Example (update contact details):
// PATCH /api/nominee/:id
// {
//   "nomineePhone": "01898765432",
//   "nomineePhoto": "https://cdn.example.com/new-photo.jpg"
// }
export class UpdateNomineeDto extends createZodDto(
  nomineeUpdateInputSchema,
) {}
