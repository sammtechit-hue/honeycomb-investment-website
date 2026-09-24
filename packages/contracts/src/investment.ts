import { z } from 'zod';
import {
  dateSchema,
  incomingPaymentMethodSchema,
  incomingPaymentStatusSchema,
  limitValidationSchema,
  maxAmountQuerySchema,
  minAmountQuerySchema,
  moneySchema,
  nonNegativeNumberSchema,
  pageValidationSchema,
  percentSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

export {
  incomingPaymentMethodSchema,
  incomingPaymentStatusSchema,
} from './common.js';



export const investmentTypeSchema = z.enum(
  ['fixed', 'unfixed'],
  {
    message: 'Investment type must be one of: fixed, unfixed',
  },
);
// Mirrors Prisma `InvestmentStatus` enum
export const investmentStatusSchema = z.enum(['pending', 'active']);

export const disbursementPeriodSchema = z.enum(
  ['monthly', 'quarterly', 'half_yearly', 'yearly'],
  {
    message:
      'Disbursement period must be one of: monthly, quarterly, half_yearly, yearly',
  },
);

// InvestmentCreateInputSchema
export const investmentCreateInputSchema = z
  .object({
    projectId: uuidSchema,
    investmentDate: dateSchema.optional(),
    amount: moneySchema,
    investmentType: investmentTypeSchema,
    // Only meaningful for fixed-rate investments — enforced below since a
    // Confirmed: an explicit period must be 3+ months.
    investmentPeriodMonths: z.coerce
      .number()
      .int('Investment period must be a whole number of months')
      .min(1, 'Minimum investment period is 1 month')
      .default(3),
    disbursementPeriod: disbursementPeriodSchema,
  })

export type InvestmentCreateInput = z.infer<typeof investmentCreateInputSchema>;


// For admin 
export const investmentAdminUpdateInputSchema = investmentCreateInputSchema
  .extend({
    status: investmentStatusSchema.optional(),
    // rate is intentionally excluded — admin sets it during approval
    rate: percentSchema.optional(),
    agreementEndDate: dateSchema.optional(),
    agreementPlace: z.string().trim().max(150).optional(),
    deedOffical: z.string().trim().optional(),
    deedGoverment: z.string().trim().optional(),

    // --- Physical Items Tracking ---
    chequeGiven: z.boolean().optional(),
    cashVoucharGiven: z.boolean().optional(),

    souvenirGiven: z.boolean().optional(),
    isSouvenirApplicable: z.boolean().optional(),

    certificateGiven: z.boolean().optional(),
    isCertificateApplicable: z.boolean().optional(),

    // --- Notes ---
    specialInstruction: z
      .string()
      .trim()
      .max(1000, 'Special instruction cannot exceed 1000 characters')
      .optional(),
  })
  .partial();

export type InvestmentAdminUpdateInputSchema = z.infer<typeof investmentAdminUpdateInputSchema>;


// For investor
export const investmentUpdateInputSchema = investmentCreateInputSchema
  .pick({
    investmentPeriodMonths: true,
    disbursementPeriod: true,
    amount: true,
  })
  .partial();

export type InvestmentUpdateInput = z.infer<
  typeof investmentUpdateInputSchema
>;

const emptyToUndefined = (v: unknown) => v === "" ? undefined : v;

// For query
export const investmentQuerySchema = z.object({
  search: searchValidationSchema,
  status: investmentStatusSchema.optional(),
  investmentType: investmentTypeSchema.optional(),
  disbursementPeriod: disbursementPeriodSchema.optional(),
  projectId: z.preprocess(emptyToUndefined, uuidSchema.optional()),
  paymentMethod: incomingPaymentMethodSchema.optional(),
  paymentStatus: incomingPaymentStatusSchema.optional(),
  paymentAmount: nonNegativeNumberSchema.optional(),
  investorId: uuidSchema.optional(),

  // Filtering ranges
  minAmount: minAmountQuerySchema,
  maxAmount: maxAmountQuerySchema,
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),

  // Pagination
  page: pageValidationSchema,
  limit: limitValidationSchema,

  // Sorting
  sortBy: z
    .enum([
      'amount',
      'rate',
      'investmentDate',
      'investmentPeriodMonths',
      'status',
      'paymentMethod',
      'paymentStatus',
      'createdAt',
    ])
    .default('createdAt'),
  sortOrder: sortOrderSchema,
})

export type InvestmentQuerySchema = z.infer<typeof investmentQuerySchema>;