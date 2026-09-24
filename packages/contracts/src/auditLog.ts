import { z } from 'zod';
import { dateSchema, ipAddressSchema, limitValidationSchema, pageValidationSchema, searchValidationSchema, sortOrderSchema, uuidSchema } from './common.js';

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


// Mirrors Prisma `LogSeverity` enum.
export const logSeveritySchema = z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);

// Mirrors Prisma `LogStatus` enum.
export const logStatusSchema = z.enum(['SUCCESS', 'FAILURE', 'PENDING']);

export const logModuleSchema = z.enum([
  'INVESTOR',
  'INVESTMENT',
  'KYC',
  'DISBURSEMENT',
  'WITHDRAWAL',
  'REFERRAL',
  'COMPANY_DOCUMENT',
  'AUTH',
  'SYSTEM',
]);

// The table/entity the action was performed on, e.g. "investors".
// VarChar(50) in Prisma.
export const auditTargetTableSchema = z
  .string()
  .trim()
  .min(2, 'Target table must be at least 2 characters')
  .max(50, 'Target table cannot exceed 50 characters');

export const auditTargetLabelSchema = z
  .string()
  .trim()
  .min(1, 'Target label cannot be empty')
  .max(255, 'Target label cannot exceed 255 characters');


export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);



export const auditUserAgentSchema = z
  .string()
  .trim()
  .max(512, 'User agent cannot exceed 512 characters');

export const auditSessionIdSchema = z
  .string()
  .trim()
  .min(1, 'Session id cannot be empty')
  .max(255, 'Session id cannot exceed 255 characters');

export const auditStatementSchema = z
  .string()
  .trim()
  .max(5000, 'Statement cannot exceed 5000 characters');


// ============================================================================
// Base Audit Log Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const auditLogBaseSchema = z.object({
  adminProfileId: uuidSchema.nullish(),
  adminName: z
    .string()
    .trim()
    .max(150, 'Admin name cannot exceed 150 characters')
    .nullish(),
  action: auditActionSchema,
  // Uuid of the affected row.
  module: logModuleSchema.nullish(),
  // Acting admin (null for system-generated entries).
  severity: logSeveritySchema.default('INFO'),
  status: logStatusSchema.default('SUCCESS'),

  targetLabel: auditTargetLabelSchema.nullish(),
  targetId: uuidSchema,
  targetTable: auditTargetTableSchema,

  oldValue: jsonValueSchema.nullish(),
  newValue: jsonValueSchema.nullish(),
  metadata: jsonValueSchema.nullish(),

  ipAddress: ipAddressSchema.nullish(),
  userAgent: auditUserAgentSchema.nullish(),
  sessionId: auditSessionIdSchema.nullish(),
  statement: auditStatementSchema.nullish(),
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
  'severity',
  'status',
  'module',
]);

export const auditLogQuerySchema = z
  .object({
    // Free-text search over action, target table and admin name.
    search: searchValidationSchema,

    // --- Filters ---
    action: auditActionSchema.optional(),
    targetTable: auditTargetTableSchema.optional(),
    targetId: uuidSchema.optional(),
    adminProfileId: uuidSchema.optional(),

    // Time range (both ends inclusive and optional) — the natural "when"
    // filter for audit trails (@@index([createdAt])).
    createdFrom: dateSchema.optional(),
    createdTo: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: auditLogSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
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
