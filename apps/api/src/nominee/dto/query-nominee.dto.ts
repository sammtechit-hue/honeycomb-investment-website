import { createZodDto } from 'nestjs-zod';
import { nomineeQuerySchema } from '@investment-platform/contracts/nominee';

// GET /api/nominee?search=Ayesha&page=1&limit=10
//   &sortBy=nomineeName&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class NomineeQueryDto extends createZodDto(nomineeQuerySchema) {}
