import { createZodDto } from 'nestjs-zod';
import { adminNotificationQuerySchema } from '@investment-platform/contracts/notification';

// GET /api/notification?search=payout&type=upcoming_payout&isRead=false
//   &referenceType=&referenceId=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Query string validated by ZodValidationPipe via @Query() decorator.
export class NotificationQueryDto extends createZodDto(
  adminNotificationQuerySchema,
) {}
