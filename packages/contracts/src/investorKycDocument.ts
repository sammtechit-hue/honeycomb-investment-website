import { z } from 'zod';
import {
  dateSchema,
  limitValidationSchema,
  pageValidationSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';
// The document rules (three valid file URLs) and the review-state enum already
// exist for nested investor registration — reuse them as the single source of
// truth instead of duplicating them here.
import { kycDocumentsSchema, verificationStatusSchema } from './investor.js';

// ============================================================================
// Investor KYC Document — shared zod contracts
// Source of truth: Prisma model `InvestorKycDocument` (schema.prisma §3)
// 1:1 with Investor (`investorId` is unique): one NID front/back + photo set
// per investor, carrying the review outcome in `verificationStatus`.
// ============================================================================

// ============================================================================
// Base Investor KYC Document Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const investorKycDocumentBaseSchema = kycDocumentsSchema.extend({
  // The investor this KYC set belongs to (unique FK in Prisma).
  investorId: uuidSchema,
  // Review outcome. Fresh uploads start as `pending` until an admin decides.
  verificationStatus: verificationStatusSchema.default('pending'),
});

// ============================================================================
// Investor KYC Document Create Schema
// For POST /investor-kyc-document and POST /admin/investor-kyc-document
// ============================================================================

export const investorKycDocumentCreateInputSchema = investorKycDocumentBaseSchema;

export type InvestorKycDocumentCreateInput = z.infer<
  typeof investorKycDocumentCreateInputSchema
>;

// ============================================================================
// Investor KYC Document Update Schema
// For PATCH /investor-kyc-document/:id
// ============================================================================
// All fields optional. `investorId` is intentionally omittable — the relation
// is 1:1, and re-pointing a document set would let an unreviewed NID/photo
// speak for a different person.
// ============================================================================

export const investorKycDocumentUpdateInputSchema = investorKycDocumentBaseSchema
  .omit({ investorId: true })
  .partial();

export type InvestorKycDocumentUpdateInput = z.infer<
  typeof investorKycDocumentUpdateInputSchema
>;

// ============================================================================
// Investor KYC Document Query Schema
// For GET /investor-kyc-document and GET /admin/investor-kyc-document
// ============================================================================

export const investorKycDocumentSortBySchema = z.enum([
  'uploadedAt',
  'verificationStatus',
]);

export const investorKycDocumentQuerySchema = z
  .object({
    // Free-text search over the investor's name and the document references.
    search: searchValidationSchema,

    // --- Filters ---
    investorId: uuidSchema.optional(),
    verificationStatus: verificationStatusSchema.optional(),

    // Uploaded-at range (both ends inclusive and optional). The model has no
    // `createdAt`; `uploadedAt` is its creation timestamp.
    uploadedFrom: dateSchema.optional(),
    uploadedTo: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    // `verificationStatus` carries the admin review queue; newest first is the
    // useful default.
    sortBy: investorKycDocumentSortBySchema.default('uploadedAt'),
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

export type InvestorKycDocumentQuery = z.infer<
  typeof investorKycDocumentQuerySchema
>;
