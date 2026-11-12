import { z } from 'zod';
import { dateSchema, limitValidationSchema, pageValidationSchema, queryBooleanSchema, searchValidationSchema, sortOrderSchema, uuidSchema } from './common.js';


const addUsedCodeIssues = (
  data: {
    isUsed?: boolean | null;
    referredId?: string | null;
    usedAt?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.isUsed === true && data.referredId == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'referredId is required once isUsed is true',
      path: ['referredId'],
    });
  }

  if (data.usedAt != null && data.isUsed === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'isUsed must be true when usedAt is provided',
      path: ['isUsed'],
    });
  }
};


const addPartialUsedCodeIssues = (
  data: {
    isUsed?: boolean | null;
    referredId?: string | null;
    usedAt?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.isUsed === true && data.referredId === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'referredId cannot be cleared while isUsed is true',
      path: ['referredId'],
    });
  }

  if (data.usedAt != null && data.isUsed === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'isUsed must be true when usedAt is provided',
      path: ['isUsed'],
    });
  }
};

export const referralCodeValueSchema = z
  .string()
  .trim()
  .min(4, 'Referral code must be at least 4 characters')
  .max(20, 'Referral code cannot exceed 20 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Referral code may only contain letters and numbers')
  .transform((val) => val.toUpperCase());

// ============================================================================
// Base Referral Code Schema
// ============================================================================
const referralCodeBaseSchema = z.object({
  referrerId: uuidSchema,
  referredId: uuidSchema.nullish(),
  isUsed: z.boolean().default(false),
  expiresAt: dateSchema.optional(),
  usedAt: dateSchema.optional(),
});

// ============================================================================
// Referral Code Create Schema
// For POST /refferal-code
// ============================================================================
export const referralCodeCreateInputSchema = referralCodeBaseSchema.superRefine(
  addUsedCodeIssues,
);

export type ReferralCodeCreateInput = z.infer<
  typeof referralCodeCreateInputSchema
>;

// ============================================================================
// Referral Code Update Schema
// For PATCH /refferal-code/:id
// ============================================================================
// Every field is optional; the used-code rules are only re-checked for the
// fields actually present in the request body.
// ============================================================================

export const referralCodeUpdateInputSchema = referralCodeBaseSchema
  .partial()
  .superRefine(addPartialUsedCodeIssues);

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

    // Expiry range (both ends inclusive and optional) — useful for cleaning up
    // codes whose expiry date has passed (@@index([expiresAt])).
    expiresAfter: dateSchema.optional(),
    expiresBefore: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: referralCodeSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .refine(
    (data) =>
      data.expiresAfter == null ||
      data.expiresBefore == null ||
      data.expiresBefore >= data.expiresAfter,
    {
      message: 'expiresBefore must be on or after expiresAfter',
      path: ['expiresBefore'],
    },
  );

export type ReferralCodeQuery = z.infer<typeof referralCodeQuerySchema>;
