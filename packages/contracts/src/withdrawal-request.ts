import { z } from 'zod';
import { moneySchema, uuidSchema } from './common.js';

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

// Query strings arrive as text, so "true"/"false" is mapped to a real boolean.
// (z.coerce.boolean() is not used on purpose — Boolean('false') is true.)
export const queryBooleanSchema = z
  .enum(['true', 'false'], { message: 'Value must be "true" or "false"' })
  .transform((val) => val === 'true');

// @db.Date columns in Prisma — accepts any Date-parseable input.
export const dbDateSchema = z.coerce.date();

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
  requestDate: dbDateSchema,

  // Optional notice-period bookkeeping (int + @db.Date, both nullable).
  noticePeriodDays: z
    .number()
    .int('Notice period days must be a whole number')
    .min(0, 'Notice period days cannot be negative')
    .max(365, 'Notice period days cannot exceed 365')
    .nullish(),
  noticePeriodEnd: dbDateSchema.nullish(),

  // When the money is scheduled to be disbursed (@db.Date).
  disbursementDate: dbDateSchema.nullish(),

  // Mirrors the Prisma default of pending.
  status: withdrawalStatusSchema.default('pending'),

  // The disbursement item that eventually paid this request (unique FK).
  paidDisbursementItemId: uuidSchema.nullish(),
});

// ============================================================================
// Withdrawal Request Create Schema
// For POST /withdrawal-request
// ============================================================================

const addCreateWithdrawalIssues = (
  data: {
    noticePeriodDays?: number | null;
    noticePeriodEnd?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  // Cross-field rule: an end date is derived from the notice length, so if an
  // end date is given the length in days must be provided too.
  if (data.noticePeriodEnd != null && data.noticePeriodDays == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'noticePeriodDays is required when noticePeriodEnd is provided',
      path: ['noticePeriodDays'],
    });
  }
};

export const withdrawalRequestCreateInputSchema =
  withdrawalRequestBaseSchema.superRefine(addCreateWithdrawalIssues);

export type WithdrawalRequestCreateInput = z.infer<
  typeof withdrawalRequestCreateInputSchema
>;

// ============================================================================
// Withdrawal Request Update Schema
// For PATCH /withdrawal-request/:id
// ============================================================================
// Every field is optional; the notice-period rule is only re-checked for the
// fields actually present in the request body.
// ============================================================================

const addUpdateWithdrawalIssues = (
  data: {
    noticePeriodDays?: number | null;
    noticePeriodEnd?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  // Update rule: the body is partial, so a stored `noticePeriodDays` may
  // already exist on the row — only a body that sets `noticePeriodEnd`
  // without any days value is treated as missing it.
  if (data.noticePeriodEnd != null && data.noticePeriodDays === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'noticePeriodDays is required when noticePeriodEnd is provided',
      path: ['noticePeriodDays'],
    });
  }
};

export const withdrawalRequestUpdateInputSchema = withdrawalRequestBaseSchema
  .partial()
  .superRefine(addUpdateWithdrawalIssues);

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
    search: z
      .string()
      .trim()
      .max(150, 'Search cannot exceed 150 characters')
      .optional(),

    // --- Filters ---
    investmentId: uuidSchema.optional(),
    status: withdrawalStatusSchema.optional(),
    withdrawalMethod: withdrawalMethodSchema.optional(),

    // Amount range (both ends inclusive and optional).
    min: moneySchema.optional(),
    max: moneySchema.optional(),

    // Request date range (both ends inclusive and optional) — the model has
    // no createdAt, so requestDate is the natural "when" filter.
    requestDateFrom: dbDateSchema.optional(),
    requestDateTo: dbDateSchema.optional(),

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
    sortBy: withdrawalRequestSortBySchema.default('requestDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
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
