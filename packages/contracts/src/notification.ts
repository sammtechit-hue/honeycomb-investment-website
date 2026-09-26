import { z } from 'zod';
import { limitValidationSchema, pageValidationSchema, queryBooleanSchema, searchValidationSchema, sortOrderSchema, uuidSchema } from './common.js';

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

  message: z
    .string()
    .trim()
    .max(255, 'Message cannot exceed 255 characters')
    .optional(),

  // Mirrors the Prisma default of false.
  isRead: z.boolean().default(false),
});

// Shared rule: the polymorphic reference is only meaningful as a pair.


// ============================================================================
// Admin Notification Create Schema
// For POST /notification
// ============================================================================

export const adminNotificationCreateInputSchema = adminNotificationBaseSchema;

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
    search: searchValidationSchema,

    // --- Filters ---
    type: adminNotificationTypeSchema.optional(),
    // "true"/"false" query string mapped to a real boolean.
    isRead: queryBooleanSchema.optional(),
    referenceId: uuidSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: adminNotificationSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
  })

export type AdminNotificationQuery = z.infer<
  typeof adminNotificationQuerySchema
>;
