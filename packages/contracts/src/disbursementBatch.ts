import { z } from 'zod';
import { fileUrlSchema } from './common.js';

// Mirrors Prisma `DisbursementSlot` — the 4 fixed payout windows.
export const disbursementSlotSchema = z.enum(
  ['slot_1', 'slot_2', 'slot_3', 'slot_4'],
  {
    message: 'Slot must be one of: slot_1, slot_2, slot_3, slot_4',
  },
);

// Mirrors Prisma `DisbursementExportType` — format of the exported file.
export const disbursementExportTypeSchema = z.enum(
  ['cbl', 'beftn'],
  {
    message: 'Export type must be one of: cbl, beftn',
  },
);

// Mirrors Prisma `DisbursementBatchStatus`.
export const disbursementBatchStatusSchema = z.enum(
  ['draft', 'exported', 'confirmed'],
  {
    message: 'Status must be one of: draft, exported, confirmed',
  },
);

// ============================================================================
// Base Disbursement Batch Schema
// ============================================================================
// Keep this as a ZodObject so the update schema can call `.partial()`.
// Cross-field rules live on the create/update schemas below.
// ============================================================================

const disbursementBatchBaseSchema = z.object({
  // One of the 4 fixed windows — required in Prisma.
  slot: disbursementSlotSchema,

  // Human-readable display label, e.g. "1st-8th". VarChar(50) in Prisma.
  slotLabel: z
    .string()
    .trim()
    .min(1, 'Slot label is required')
    .max(50, 'Slot label cannot exceed 50 characters'),

  // Batch date — @db.Date in Prisma; accepts ISO strings and Date objects.
  batchDate: z.coerce.date(),

  // Export file type for the whole batch — required in Prisma.
  exportType: disbursementExportTypeSchema,

  // Generated export file — optional until the batch is exported.
  fileUrl: fileUrlSchema.optional(),

  // Defaults to draft in Prisma; only set explicitly to skip the draft step.
  status: disbursementBatchStatusSchema.default('draft'),
});

// ============================================================================
// Disbursement Batch Create Schema
// For POST /disbursement-batch and POST /admin/disbursement-batch
// ============================================================================

export const disbursementBatchCreateInputSchema =
  disbursementBatchBaseSchema.superRefine((data, ctx) => {
    // A batch can only leave the draft stage once its export file exists.
    // `status` defaults to draft, so this only fires when it is set explicitly.
    if (data.status !== 'draft' && data.fileUrl == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fileUrl is required once status is exported or confirmed',
        path: ['fileUrl'],
      });
    }
  });

export type DisbursementBatchCreateInput = z.infer<
  typeof disbursementBatchCreateInputSchema
>;


export const disbursementBatchUpdateInputSchema =
  disbursementBatchBaseSchema.partial();

export type DisbursementBatchUpdateInput = z.infer<
  typeof disbursementBatchUpdateInputSchema
>;

// ============================================================================
// Disbursement Batch Query Schema
// For GET /disbursement-batch and GET /admin/disbursement-batch
// ============================================================================

export const disbursementBatchSortBySchema = z.enum([
  'slot',
  'batchDate',
  'exportType',
  'status',
  'createdAt',
]);

export const disbursementBatchQuerySchema = z
  .object({
    // Free-text search over the slot label (e.g. "1st-8th").
    search: z
      .string()
      .trim()
      .max(50, 'Search cannot exceed 50 characters')
      .optional(),

    // --- Filters ---
    slot: disbursementSlotSchema.optional(),
    exportType: disbursementExportTypeSchema.optional(),
    status: disbursementBatchStatusSchema.optional(),

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
    sortBy: disbursementBatchSortBySchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })

export type DisbursementBatchQuery = z.infer<
  typeof disbursementBatchQuerySchema
>;
