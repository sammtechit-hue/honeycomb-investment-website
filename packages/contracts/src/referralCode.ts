import { z } from 'zod';
import { dateSchema, limitValidationSchema, pageValidationSchema, queryBooleanSchema, searchValidationSchema, sortOrderSchema, uuidSchema } from './common.js';


// ============================================================================
// Referral Code Update Schema
// For PATCH /refferal-code/:id
// ============================================================================
// Only the expiry date is editable here; usage and active state are managed by
// the referral flows.
// ============================================================================

export const referralCodeUpdateInputSchema = z.object({
  expiresAt: dateSchema.optional(),
})

export type ReferralCodeUpdateInput = z.infer<
  typeof referralCodeUpdateInputSchema
>;

// ============================================================================
// Referral Code Query Schema
// For GET /refferal-code
// ============================================================================

export const referralCodeSortBySchema = z.enum([
  'code',
  'isUsed',
  'createdAt',
  'expiresAt',
  'usedAt',
  'referrerId' // the referrer investor names
]);

export const referralCodeQuerySchema = z
  .object({
    // Free-text search over the code and the referrer/referred investor names
    // (relation fields). VarChar(150) investor names.
    search: searchValidationSchema,

    // --- Filters ---
    referrerId: uuidSchema.optional(),
    referredId: uuidSchema.optional(),
    isUsed: queryBooleanSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: referralCodeSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
  })

export type ReferralCodeQuery = z.infer<typeof referralCodeQuerySchema>;
