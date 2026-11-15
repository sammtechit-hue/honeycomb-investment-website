import { z } from 'zod';
import {
  dateSchema,
  limitValidationSchema,
  moneySchema,
  nonNegativeNumberSchema,
  pageValidationSchema,
  percentSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

export const bonusPercentSchema = percentSchema;


const referralBaseSchema = z.object({
  // Referral bonus — mirrors the Prisma default of 1.00%.
  bonusPercent: bonusPercentSchema.default(1),

  // Bonus amount actually paid — Decimal(14, 2) in Prisma, nullable until the
  // bonus is settled (moneySchema rounds to 2 decimals).
  bonusAmount: moneySchema.optional(),
});



// export const referralCreateInputSchema = referralBaseSchema.superRefine(
//   (data, ctx) => {
//     // Self-referrals would pay the bonus back to the referrer themselves.
//     if (data.referrerId === data.referredInvestorId) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: 'An investor cannot refer themselves',
//         path: ['referredInvestorId'],
//       });
//     }
//   },
// );

// export type ReferralCreateInput = z.infer<typeof referralCreateInputSchema>;


export const referralUpdateInputSchema = referralBaseSchema
  .partial()

export type ReferralUpdateInput = z.infer<typeof referralUpdateInputSchema>;


export const referralSortBySchema = z.enum([
  'bonusAmount',
  'createdAt',
]);

export const referralQuerySchema = z
  .object({
    search: searchValidationSchema,  // can be searched by referral code or investor full name
    // --- Filters ---
    referrerId: uuidSchema.optional(),
    referredInvestorId: uuidSchema.optional(),

    // Bonus amount range (both ends inclusive and optional).
    minBonusAmount: nonNegativeNumberSchema.optional(),
    maxBonusAmount: nonNegativeNumberSchema.optional(),


    // Created-at range (both ends inclusive).
    fromDate: dateSchema.optional(),
    toDate: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: referralSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
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
