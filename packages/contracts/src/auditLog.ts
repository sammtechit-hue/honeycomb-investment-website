import { z } from 'zod';
import { uuidSchema } from './common.js';

// ============================================================================
// Audit Log — shared zod contracts
// Source of truth: Prisma model `AuditLog` (schema.prisma §20)
// Append-only trail of admin actions: who did what, to which row, when.
// ============================================================================

// Mirrors Prisma `AuditAction` enum — kept in sync with prisma schema
// (avoids a runtime dep on @prisma/client in the shared contracts package).
export const auditActionSchema = z.enum([
  'investor_registered',
  'investor_kyc_uploaded',
  'investor_kyc_status_changed',
  'investor_status_changed',
  'investor_verified',
  'investment_created',
  'investment_status_changed',
  'monthly_rate_set',
  'disbursement_batch_created',
  'disbursement_batch_exported',
  'disbursement_batch_confirmed',
  'withdrawal_status_changed',
  'referral_code_generated',
  'company_document_uploaded',
]);

// The table/entity the action was performed on, e.g. "investors".
// VarChar(50) in Prisma.
export const auditTargetTableSchema = z
  .string()
  .trim()
  .min(2, 'Target table must be at least 2 characters')
  .max(50, 'Target table cannot exceed 50 characters');


// ============================================================================
// Base Audit Log Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const auditLogBaseSchema = z.object({
  action: auditActionSchema,
  targetTable: auditTargetTableSchema,
  // Uuid of the affected row.
  targetId: uuidSchema,
  // Acting admin (null for system-generated entries).
  adminProfileId: uuidSchema.nullish(),
  // Denormalized display name kept for readability after profile deletion.
  adminName: z
    .string()
    .trim()
    .max(150, 'Admin name cannot exceed 150 characters')
    .nullish(),
});

// ============================================================================
// Audit Log Create Schema
// For POST /admin/audit-log
// ============================================================================

export const auditLogCreateInputSchema = auditLogBaseSchema;

export type AuditLogCreateInput = z.infer<typeof auditLogCreateInputSchema>;

// ============================================================================
// Audit Log Update Schema
// For PATCH /admin/audit-log/:id
// ============================================================================
// All fields optional. Audit logs are append-only in spirit — the update
// endpoint exists for corrections (e.g. fixing details), so `action`,
// `targetTable` and `targetId` are excluded: changing what an entry claims
// would defeat the purpose of the trail.
// ============================================================================

export const auditLogUpdateInputSchema = auditLogBaseSchema
  .omit({ action: true, targetTable: true, targetId: true })
  .partial();

export type AuditLogUpdateInput = z.infer<typeof auditLogUpdateInputSchema>;

// ============================================================================
// Audit Log Query Schema
// For GET /admin/audit-log
// ============================================================================

export const auditLogSortBySchema = z.enum([
  'action',
  'targetTable',
  'createdAt',
  'adminProfileId',
]);

export const auditLogQuerySchema = z
  .object({
    // Free-text search over action, target table and admin name.
    search: z
      .string()
      .trim()
      .max(150, 'Search cannot exceed 150 characters')
      .optional(),

    // --- Filters ---
    action: auditActionSchema.optional(),
    targetTable: auditTargetTableSchema.optional(),
    targetId: uuidSchema.optional(),
    adminProfileId: uuidSchema.optional(),

    // Time range (both ends inclusive and optional) — the natural "when"
    // filter for audit trails (@@index([createdAt])).
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),

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
    sortBy: auditLogSortBySchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (data) =>
      data.createdFrom == null ||
      data.createdTo == null ||
      data.createdTo >= data.createdFrom,
    {
      message: 'createdTo must be on or after createdFrom',
      path: ['createdTo'],
    },
  );

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
