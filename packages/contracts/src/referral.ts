import { z } from 'zod';
import { moneySchema, uuidSchema } from './common.js';


export const bonusPercentSchema = z
  .coerce
  .number()
  .min(0, 'Bonus percent cannot be negative')
  .max(100, 'Bonus percent cannot exceed 100')
  // Round to 2 decimal places to match Decimal(5,2).
  .transform((val) => Math.round(val * 100) / 100);


const referralBaseSchema = z.object({
  // Investor who referred another investor (required in Prisma).
  referrerId: uuidSchema,

  // Investor who was referred. Unique in Prisma — an investor can only be
  // referred once — which the database enforces.
  referredInvestorId: uuidSchema,

  // The ReferralCode row this referral was created with (required in Prisma).
  referralCodeId: uuidSchema,

  // Referral bonus — mirrors the Prisma default of 1.00%.
  bonusPercent: bonusPercentSchema.default(1),

  // Bonus amount actually paid — Decimal(14, 2) in Prisma, nullable until the
  // bonus is settled (moneySchema rounds to 2 decimals).
  bonusAmount: moneySchema.optional(),
});



export const referralCreateInputSchema = referralBaseSchema.superRefine(
  (data, ctx) => {
    // Self-referrals would pay the bonus back to the referrer themselves.
    if (data.referrerId === data.referredInvestorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An investor cannot refer themselves',
        path: ['referredInvestorId'],
      });
    }
  },
);

export type ReferralCreateInput = z.infer<typeof referralCreateInputSchema>;


export const referralUpdateInputSchema = referralBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.referrerId != null &&
      data.referredInvestorId != null &&
      data.referrerId === data.referredInvestorId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An investor cannot refer themselves',
        path: ['referredInvestorId'],
      });
    }
  });

export type ReferralUpdateInput = z.infer<typeof referralUpdateInputSchema>;


export const referralSortBySchema = z.enum([
  'bonusAmount',
  'createdAt',
]);

export const referralQuerySchema = z
  .object({
    
    // investor names (relation fields). VarChar(150) investor names.
    search: z
      .string()
      .trim()
      .max(150, 'Search cannot exceed 150 characters')
      .optional(),

    // --- Filters ---
    referrerId: uuidSchema.optional(),
    referredInvestorId: uuidSchema.optional(),
    referralCodeId: uuidSchema.optional(),

    // Bonus amount range (both ends inclusive and optional).
    minBonusAmount: z.coerce
      .number()
      .nonnegative('minBonusAmount cannot be negative')
      .optional(),
    maxBonusAmount: z.coerce
      .number()
      .nonnegative('maxBonusAmount cannot be negative')
      .optional(),


    // Created-at range (both ends inclusive).
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),

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
    sortBy: referralSortBySchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  
  .refine(
    (data) =>
      data.minBonusAmount == null ||
      data.maxBonusAmount == null ||
      data.maxBonusAmount >= data.minBonusAmount,
    {
      message: 'maxBonusAmount must be greater than or equal to minBonusAmount',
      path: ['maxBonusAmount'],
    },
  )

export type ReferralQuery = z.infer<typeof referralQuerySchema>;
