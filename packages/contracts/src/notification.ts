import { z } from 'zod';
import { queryBooleanSchema, uuidSchema } from './common.js';

// ============================================================================
// Admin Notification — shared zod contracts
// Source of truth: Prisma model `AdminNotification` (schema.prisma §19)
// ============================================================================

// Mirrors Prisma `AdminNotificationType` enum
export const adminNotificationTypeSchema = z.enum([
  'upcoming_payout',
  'slot_reminder',
  'new_investment_request',
  'disbursement_sent',
  'company_document_expiring',
]);

// VarChar(255) in Prisma.
export const notificationMessageSchema = z
  .string()
  .trim()
  .min(1, 'Message is required')
  .max(255, 'Message cannot exceed 255 characters');

// ============================================================================
// Base Admin Notification Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const adminNotificationBaseSchema = z.object({
  type: adminNotificationTypeSchema,

  // Polymorphic reference to the related entity — e.g. referenceType
  // "investment" with the investment's uuid. Both must be sent together,
  // so the pair is validated with a superRefine below.
  referenceId: uuidSchema.nullish(),
  referenceType: z
    .string()
    .trim()
    .max(50, 'Reference type cannot exceed 50 characters')
    .nullish(),

  message: notificationMessageSchema,

  // Mirrors the Prisma default of false.
  isRead: z.boolean().default(false),
});

// Shared rule: the polymorphic reference is only meaningful as a pair.
const addReferencePairIssues = (
  data: {
    referenceId?: string | null;
    referenceType?: string | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.referenceId != null && data.referenceType == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'referenceType is required when referenceId is provided',
      path: ['referenceType'],
    });
  }

  if (data.referenceType != null && data.referenceId == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'referenceId is required when referenceType is provided',
      path: ['referenceId'],
    });
  }
};

// ============================================================================
// Admin Notification Create Schema
// For POST /notification
// ============================================================================

export const adminNotificationCreateInputSchema =
  adminNotificationBaseSchema.superRefine(addReferencePairIssues);

export type AdminNotificationCreateInput = z.infer<
  typeof adminNotificationCreateInputSchema
>;

// ============================================================================
// Admin Notification Update Schema
// For PATCH /notification/:id/status
// ============================================================================
// Only read-state changes go through this endpoint — the notification content
// itself is immutable.
// ============================================================================

export const adminNotificationStatusUpdateInputSchema = z
  .object({
    isRead: z.boolean({ required_error: 'isRead is required' }),
  });

export type AdminNotificationStatusUpdateInput = z.infer<
  typeof adminNotificationStatusUpdateInputSchema
>;

// ============================================================================
// Admin Notification Query Schema
// For GET /notification
// ============================================================================

export const adminNotificationSortBySchema = z.enum([
  'type',
  'isRead',
  'createdAt',
]);

export const adminNotificationQuerySchema = z
  .object({
    // Free-text search over the message.
    search: z
      .string()
      .trim()
      .max(255, 'Search cannot exceed 255 characters')
      .optional(),

    // --- Filters ---
    type: adminNotificationTypeSchema.optional(),
    // "true"/"false" query string mapped to a real boolean.
    isRead: queryBooleanSchema.optional(),
    referenceType: z
      .string()
      .trim()
      .max(50, 'Reference type cannot exceed 50 characters')
      .optional(),
    referenceId: uuidSchema.optional(),

    // --- Pagination ---
    page: z.coerce
      .number()
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .default(1),
    limit: z.coerce
      .number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(10),

    // --- Sorting ---
    sortBy: adminNotificationSortBySchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })

export type AdminNotificationQuery = z.infer<
  typeof adminNotificationQuerySchema
>;
