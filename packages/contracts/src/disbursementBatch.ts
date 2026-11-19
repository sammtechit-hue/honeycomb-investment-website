import { z } from 'zod';
import {
  bankExportFormatSchema,
  dateSchema,
  fileUrlSchema,
  limitValidationSchema,
  pageValidationSchema,
  searchValidationSchema,
  sortOrderSchema,
} from './common.js';

export const disbursementExportTypeSchema = bankExportFormatSchema;

export const disbursementBatchStatusSchema = z.enum(
  ['draft', 'exported', 'confirmed'],
  {
    message: 'Status must be one of: draft, exported, confirmed',
  },
);

// ============================================================================
// Base Disbursement Batch Schema
const disbursementBatchBaseSchema = z.object({
  slotLabel: z
    .string()
    .trim()
    .min(1, 'Slot label is required')
    .max(50, 'Slot label cannot exceed 50 characters').optional(),

  batchDate: dateSchema,
  exportType: disbursementExportTypeSchema,
  fileUrl: fileUrlSchema.optional(),
  status: disbursementBatchStatusSchema.default('draft'),
});

// ============================================================================
// Disbursement Batch Window Create Schema
// For POST /admin/disbursement-batch/:windowId
// ============================================================================
export const disbursementBatchWindowCreateInputSchema = z.object({
  exportType: disbursementExportTypeSchema,
  batchDate: dateSchema,
});

export type DisbursementBatchWindowCreateInput = z.infer<
  typeof disbursementBatchWindowCreateInputSchema
>;




// ============================================================================
// Disbursement Batch Update Schema
// For PATCH /admin/disbursement-batch/:id
// ============================================================================
export const disbursementBatchUpdateInputSchema =
  disbursementBatchBaseSchema
    .partial()
    // .superRefine((data, ctx) => {
    //   // A batch can only leave the draft stage once its export file exists.
    //   // Fields are optional here, so only check when status is sent.
    //   if (
    //     data.status !== undefined &&
    //     data.status !== 'draft' &&
    //     data.fileUrl == null
    //   ) {
    //     ctx.addIssue({
    //       code: z.ZodIssueCode.custom,
    //       message: 'fileUrl is required once status is exported or confirmed',
    //       path: ['fileUrl'],
    //     });
    //   }
    // });

export type DisbursementBatchUpdateInput = z.infer<
  typeof disbursementBatchUpdateInputSchema
>;




// ============================================================================
// Disbursement Batch Query Schema
// For GET /disbursement-batch and GET /admin/disbursement-batch
// ============================================================================
export const disbursementBatchSortBySchema = z.enum([
  'batchDate',
  'exportType',
  'status',
  'createdAt',
]);

export const disbursementBatchQuerySchema = z
  .object({
    // Free-text search over the slot label (e.g. "1st-8th").
    search: searchValidationSchema,

    // --- Filters ---
    exportType: disbursementExportTypeSchema.optional(),
    status: disbursementBatchStatusSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: disbursementBatchSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
  })

export type DisbursementBatchQuery = z.infer<
  typeof disbursementBatchQuerySchema
>;
