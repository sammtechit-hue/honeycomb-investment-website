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
export const investmentStatusSchema = z.enum([
  'pending',
  'active',
  'rejected',
  'closed',
]);

export const disbursementPeriodSchema = z.enum(
  ['monthly', 'quarterly', 'half_yearly', 'yearly'],
  {
    message:
      'Disbursement period must be one of: monthly, quarterly, half_yearly, yearly',
  },
);

// Months behind each disbursementPeriod value (mirrors the Prisma enum).
export const disbursementPeriodMonths: Record<
  z.infer<typeof disbursementPeriodSchema>,
  number
> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

// Human-readable label used inside the rule's error message.
const disbursementPeriodLabels: Record<
  keyof typeof disbursementPeriodMonths,
  string
> = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  half_yearly: 'half-yearly',
  yearly: 'yearly',
};

/**
 * Cross-field rule: investmentPeriodMonths must be a positive whole number
 * of months AND an exact multiple of the profit disbursement period (so every
 * disbursement lands on a real cycle). Returns the error message, or null
 * when the combination is valid.
 *
 * Shared by the zod refinements below and the Nest service layer (which turns
 * a non-null result into a BadRequestException) so the rule lives in one place.
 *
 * When disbursementPeriod is absent (partial update payloads) the check is
 * skipped here — callers must re-run it with the merged final values.
 */
export function investmentPeriodDisbursementError(input: {
  investmentPeriodMonths?: number | null;
  disbursementPeriod?: string | null;
}): string | null {
  const { investmentPeriodMonths, disbursementPeriod } = input;
  if (
    disbursementPeriod != null &&
    disbursementPeriod in disbursementPeriodMonths
  ) {
    if (
      typeof investmentPeriodMonths !== 'number' ||
      !Number.isInteger(investmentPeriodMonths) ||
      investmentPeriodMonths < 1
    ) {
      return 'Investment period must be a positive whole number of months';
    }
    const months =
      disbursementPeriodMonths[
        disbursementPeriod as keyof typeof disbursementPeriodMonths
      ];
    // monthly (1) accepts any positive integer of months.
    if (months > 1 && investmentPeriodMonths % months !== 0) {
      return `Investment period must be a multiple of ${months} months for ${disbursementPeriodLabels[disbursementPeriod as keyof typeof disbursementPeriodLabels]} disbursement`;
    }
  }
  return null;
}

// Super-refine adapter for the rule above; issues are reported on
// investmentPeriodMonths so forms can surface the error at that field.
function refineInvestmentPeriodAgainstDisbursement(
  data: {
    investmentPeriodMonths?: number | null;
    disbursementPeriod?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  const message = investmentPeriodDisbursementError(data);
  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['investmentPeriodMonths'],
      message,
    });
  }
}

// Field definitions only (no refinement), so the update schemas below can
// still .pick() / .extend() from them.
const investmentCreateFieldsSchema = z.object({
  projectId: uuidSchema,
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
});

// InvestmentCreateInputSchema
export const investmentCreateInputSchema =
  investmentCreateFieldsSchema.superRefine(
    refineInvestmentPeriodAgainstDisbursement,
  );

export type InvestmentCreateInput = z.infer<typeof investmentCreateInputSchema>;


// For admin
export const investmentAdminUpdateInputSchema = investmentCreateFieldsSchema
  .extend({
    status: investmentStatusSchema.optional(),
    // rate is intentionally excluded — admin sets it during approval
    rate: percentSchema.optional(),
    investmentDate: dateSchema.optional(),
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
  .partial()
  // Only enforced when the payload carries both fields; the Service
  // re-validates merged values on partial updates.
  .superRefine(refineInvestmentPeriodAgainstDisbursement);

export type InvestmentAdminUpdateInputSchema = z.infer<typeof investmentAdminUpdateInputSchema>;


// For investor
export const investmentUpdateInputSchema = investmentCreateFieldsSchema
  .pick({
    investmentPeriodMonths: true,
    // disbursementPeriod: true,
    amount: true,
    investmentType: true
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
  // Investors may also sort on their single (one-to-one) incoming payment.
  sortBy: z
    .enum([
      'amount',
      'rate',
      'investmentDate',
      'investmentPeriodMonths',
      'status',
      'paymentMethod',
      'paymentStatus',
      'paymentAmount',
      'createdAt',
    ])
    .default('createdAt'),
  sortOrder: sortOrderSchema,
})

export type InvestmentQuerySchema = z.infer<typeof investmentQuerySchema>;