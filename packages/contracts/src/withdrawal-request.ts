import { z } from 'zod';
import { dateSchema, limitValidationSchema, moneySchema, pageValidationSchema, searchValidationSchema, sortOrderSchema, uuidSchema } from './common.js';

// ============================================================================
// Withdrawal Request — shared zod contracts
// Source of truth: Prisma model `WithdrawalRequest` (schema.prisma §14)
// ============================================================================

// --- Enums (mirrors Prisma `WithdrawalStatus` / `WithdrawalMethod`) ----------

export const withdrawalStatusSchema = z.enum([
  'pending',
  'notice_period',
  'ready',
  'paid',
  'cancelled',
]);

export const withdrawalMethodSchema = z.enum(['manual', 'auto']);

// ============================================================================
// Base Withdrawal Request Schema
// ============================================================================

const withdrawalRequestBaseSchema = z.object({
  // Investment being withdrawn from.
  investmentId: uuidSchema,

  // Decimal(14,2) — how much is being requested.
  requestedAmount: moneySchema,

  // Defaults to auto, mirroring the Prisma column default.
  withdrawalMethod: withdrawalMethodSchema.default('auto'),

  // @db.Date column — the day the withdrawal was requested.
  requestDate: dateSchema,

  // Optional notice-period bookkeeping (int + @db.Date, both nullable).
  noticePeriodDays: z
    .number()
    .int('Notice period days must be a whole number')
    .min(0, 'Notice period days cannot be negative')
    .max(365, 'Notice period days cannot exceed 365')
    .nullish(),
  noticePeriodEnd: dateSchema.nullish(),

  // When the money is scheduled to be disbursed (@db.Date).
  disbursementDate: dateSchema.nullish(),

  // Mirrors the Prisma default of pending.
  status: withdrawalStatusSchema.default('pending'),

  // The disbursement item that eventually paid this request (unique FK).
  paidDisbursementItemId: uuidSchema.nullish(),
});


const addWithdrawalNoticePeriodIssues = (
  data: {
    noticePeriodDays?: number | null;
    noticePeriodEnd?: Date | null;
  },
  ctx: z.RefinementCtx,
  mode: 'create' | 'update',
) => {
  const missingDays =
    mode === 'create'
      ? data.noticePeriodEnd != null && data.noticePeriodDays == null
      : data.noticePeriodEnd != null && data.noticePeriodDays === undefined;

  if (missingDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'noticePeriodDays is required when noticePeriodEnd is provided',
      path: ['noticePeriodDays'],
    });
  }
};

export const withdrawalRequestCreateInputSchema =
  withdrawalRequestBaseSchema.superRefine((data, ctx) =>
    addWithdrawalNoticePeriodIssues(data, ctx, 'create'),
  );

export type WithdrawalRequestCreateInput = z.infer<
  typeof withdrawalRequestCreateInputSchema
>;



export const withdrawalRequestUpdateInputSchema =
  withdrawalRequestBaseSchema
    .partial()
    .superRefine((data, ctx) =>
      addWithdrawalNoticePeriodIssues(data, ctx, 'update'),
    );

export type WithdrawalRequestUpdateInput = z.infer<
  typeof withdrawalRequestUpdateInputSchema
>;

// ============================================================================
// Withdrawal Request Query Schema
// For GET /withdrawal-request
// ============================================================================

export const withdrawalRequestSortBySchema = z.enum([
  'requestedAmount',
  'requestDate',
  'noticePeriodDays',
  'noticePeriodEnd',
  'disbursementDate',
  'status',
  'withdrawalMethod',
]);

export const withdrawalRequestQuerySchema = z
  .object({
    // Free-text search over the related investment/investor fields.
    search: searchValidationSchema,

    // --- Filters ---
    investmentId: uuidSchema.optional(),
    status: withdrawalStatusSchema.optional(),
    withdrawalMethod: withdrawalMethodSchema.optional(),

    // Amount range (both ends inclusive and optional).
    min: moneySchema.optional(),
    max: moneySchema.optional(),

    // Request date range (both ends inclusive and optional) — the model has
    // no createdAt, so requestDate is the natural "when" filter.
    requestDateFrom: dateSchema.optional(),
    requestDateTo: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: withdrawalRequestSortBySchema.default('requestDate'),
    sortOrder: sortOrderSchema,
  })
  .refine(
    (data) => data.min == null || data.max == null || data.min <= data.max,
    {
      message: 'max must be greater than or equal to min',
      path: ['max'],
    },
  )
  .refine(
    (data) =>
      data.requestDateFrom == null ||
      data.requestDateTo == null ||
      data.requestDateTo >= data.requestDateFrom,
    {
      message: 'requestDateTo must be on or after requestDateFrom',
      path: ['requestDateTo'],
    },
  );

export type WithdrawalRequestQuery = z.infer<typeof withdrawalRequestQuerySchema>;
