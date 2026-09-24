import { z } from 'zod';
import {
  dateSchema,
  fileUrlSchema,
  limitValidationSchema,
  pageValidationSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

// The eight document slots. Any of them may stay empty — paperwork arrives
// over the life of an investment (deed at signing, certificate and souvenir
// months later), so this is also the vocabulary for "which document" queries.
export const investmentDocumentKindSchema = z.enum([
  'online_deed',
  'certificate',
  'cheque',
  'cash_voucher',
  'membership_card',
  'souvenir',
  'proof_photo',
  'clearance_video',
]);

export type InvestmentDocumentKind = z.infer<
  typeof investmentDocumentKindSchema
>;

// ============================================================================
// Base Investment Document Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const investmentDocumentBaseSchema = z.object({
  online_deed: fileUrlSchema.optional(),
  certificate: fileUrlSchema.optional(),
  cheque: fileUrlSchema.optional(),
  cash_voucher: fileUrlSchema.optional(),
  membership_card: fileUrlSchema.optional(),
  souvenir: fileUrlSchema.optional(),
  proof_photo: fileUrlSchema.optional(),
  clearance_video: fileUrlSchema.optional(), //8
});

// ============================================================================
// Investment Document Create Schema
// For POST /investment-document and POST /admin/investment-document
// ============================================================================

export const investmentDocumentCreateInputSchema = investmentDocumentBaseSchema
  .extend({ investmentId: uuidSchema })
  // Every slot is optional, but a row with no documents at all is not a
  // document bundle — that would be an empty record plus a lock on the 1:1
  // relation, so at least one file is required to create it.
  .superRefine((data, ctx) => {
    const provided = investmentDocumentKindSchema.options.filter(
      (kind) => data[kind] != null,
    );

    if (provided.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At least one document URL is required (${investmentDocumentKindSchema.options.join(', ')})`,
        path: ['online_deed'],
      });
    }
  });

export type InvestmentDocumentCreateInput = z.infer<
  typeof investmentDocumentCreateInputSchema
>;

// ============================================================================
// Investment Document Update Schema
// For PATCH /investment-document/:id
// ============================================================================
// Every slot is already optional, so the update shape needs no extra
// narrowing. `investmentId` is excluded — the bundle is 1:1 with its
// investment and re-pointing it would orphan the uploaded paperwork.
// ============================================================================

export const investmentDocumentUpdateInputSchema =
  investmentDocumentBaseSchema.partial();

export type InvestmentDocumentUpdateInput = z.infer<
  typeof investmentDocumentUpdateInputSchema
>;

// ============================================================================
// Investment Document Query Schema
// For GET /investment-document and GET /admin/investment-document
// ============================================================================

export const investmentDocumentSortBySchema = z.enum([
  'uploadedAt',
  'investmentId',
]);

export const investmentDocumentQuerySchema = z
  .object({
    // Free-text search over the investor name and the document references.
    search: searchValidationSchema,

    // --- Filters ---
    investmentId: uuidSchema.optional(),
    // Only rows where this slot has a file — lets an admin pull the
    // investments still missing their certificate or clearance video.
    hasDocument: investmentDocumentKindSchema.optional(),

    // Uploaded-at range (both ends inclusive and optional). The model has no
    // createdAt/updatedAt; `uploadedAt` is its only timestamp.
    uploadedFrom: dateSchema.optional(),
    uploadedTo: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: investmentDocumentSortBySchema.default('uploadedAt'),
    sortOrder: sortOrderSchema,
  })
  .refine(
    (data) =>
      data.uploadedFrom == null ||
      data.uploadedTo == null ||
      data.uploadedTo >= data.uploadedFrom,
    {
      message: 'uploadedTo must be on or after uploadedFrom',
      path: ['uploadedTo'],
    },
  );

export type InvestmentDocumentQuery = z.infer<
  typeof investmentDocumentQuerySchema
>;
