import { z } from 'zod';
import { dateSchema, limitValidationSchema, maxAmountQuerySchema, minAmountQuerySchema, moneySchema, pageValidationSchema, percentSchema, searchValidationSchema, sortOrderSchema, uuidSchema } from './common.js';

// ============================================================================
// Monthly Profit Ledger — shared zod contracts
// Source of truth: Prisma model `MonthlyProfitLedger` (schema.prisma §11)
// ============================================================================

// Mirrors Prisma `PayoutStatus` enum
export const payoutStatusSchema = z.enum(['accrued', 'disbursed']);

// @db.Date column — the profit month, accepts any Date-parseable input.
export const periodMonthSchema = dateSchema;

// ============================================================================
// Base Monthly Profit Ledger Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const monthlyProfitLedgerBaseSchema = z.object({
  // Investment the profit belongs to.
  investmentId: uuidSchema,

  // @db.Date, unique per (investmentId, periodMonth) in Prisma.
  periodMonth: periodMonthSchema,

  // Decimal(5,2) — the monthly rate applied, e.g. 10.50 (%).
  rateApplied: percentSchema,

  // Decimal(14,2) — the computed profit for the month.
  profitAmount: moneySchema,

  // Mirrors the Prisma default of accrued.
  payoutStatus: payoutStatusSchema.default('accrued'),

  // Optional link to the disbursement item that paid this profit out.
  disbursementItemId: uuidSchema.optional(),
});

// ============================================================================
// Monthly Profit Ledger Create Schema
// For POST /admin/monthly-profit-ledger
// ============================================================================

export const monthlyProfitLedgerCreateInputSchema =
  monthlyProfitLedgerBaseSchema.superRefine((data, ctx) => {
    // A disbursed payout must point at the disbursement item that paid it;
    // an accrued one should not.
    if (data.payoutStatus === 'disbursed' && data.disbursementItemId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'disbursementItemId is required when payoutStatus is disbursed',
        path: ['disbursementItemId'],
      });
    }
  });

export type MonthlyProfitLedgerCreateInput = z.infer<
  typeof monthlyProfitLedgerCreateInputSchema
>;

// ============================================================================
// Monthly Profit Ledger Update Schema
// For PATCH /admin/monthly-profit-ledger/:id
// ============================================================================
// Every field is optional; the disbursed rule is only re-checked for the
// fields actually present in the request body (a stored
// `disbursementItemId` may already exist on the row).
// ============================================================================

export const monthlyProfitLedgerUpdateInputSchema =
  monthlyProfitLedgerBaseSchema.partial().superRefine((data, ctx) => {
    if (data.payoutStatus === 'disbursed' && data.disbursementItemId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'disbursementItemId cannot be cleared while payoutStatus is disbursed',
        path: ['disbursementItemId'],
      });
    }
  });

export type MonthlyProfitLedgerUpdateInput = z.infer<
  typeof monthlyProfitLedgerUpdateInputSchema
>;

// ============================================================================
// Monthly Profit Ledger Query Schema
// For GET /admin/monthly-profit-ledger
// ============================================================================

export const monthlyProfitLedgerSortBySchema = z.enum([
  'periodMonth',
  'rateApplied',
  'profitAmount',
  'payoutStatus',
]);

export const monthlyProfitLedgerQuerySchema = z
  .object({
    // Free-text search over the related investment info.
    search: searchValidationSchema,

    // --- Filters ---
    investmentId: uuidSchema.optional(),
    investorId: uuidSchema.optional(), // via investment.investorId
    payoutStatus: payoutStatusSchema.optional(),

    // Profit amount range (both ends inclusive and optional).
    min: minAmountQuerySchema,
    max: maxAmountQuerySchema,

    // Profit-month range (both ends inclusive and optional) — the model has
    // no createdAt, so periodMonth is the natural "when" filter.
    periodFrom: periodMonthSchema.optional(),
    periodTo: periodMonthSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: monthlyProfitLedgerSortBySchema.default('periodMonth'),
    sortOrder: sortOrderSchema,
  })
  .refine((data) => data.min == null || data.max == null || data.min <= data.max, {
    message: 'max must be greater than or equal to min',
    path: ['max'],
  })
  .refine(
    (data) =>
      data.periodFrom == null || data.periodTo == null || data.periodTo >= data.periodFrom,
    {
      message: 'periodTo must be on or after periodFrom',
      path: ['periodTo'],
    },
  );

export type MonthlyProfitLedgerQuery = z.infer<
  typeof monthlyProfitLedgerQuerySchema
>;
