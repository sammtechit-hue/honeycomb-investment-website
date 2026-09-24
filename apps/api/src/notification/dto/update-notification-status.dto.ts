import { createZodDto } from 'nestjs-zod';
import { adminNotificationStatusUpdateInputSchema } from '@investment-platform/contracts/notification';

// PATCH /api/notification/:id/status — read-state change only.
// Notification content is immutable; only isRead flips.
// See packages/contracts/src/notification.ts.
export class UpdateNotificationStatusDto extends createZodDto(
  adminNotificationStatusUpdateInputSchema,
) {}
