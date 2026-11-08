import { z } from 'zod';
import {
  dateSchema,
  limitValidationSchema,
  pageValidationSchema,
  sortOrderSchema,
} from './common.js';


// Mirrors Prisma `PayoutWindowStatus`.
export const payoutWindowStatusSchema = z.enum(['open', 'completed'], {
  message: 'Status must be one of: open, completed',
});



// ============================================================================
// Base Payout Window Schema
// ============================================================================
const payoutWindowBaseSchema = z.object({
  periodMonth: dateSchema,
  startDate: dateSchema,
  endDate: dateSchema,
});

type PayoutWindowCompletionState = {
  status?: z.infer<typeof payoutWindowStatusSchema>;
  completedAt?: Date | null;
};

const addWindowDateIssues = (
  data: { startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx,
) => {
  if (
    data.startDate != null &&
    data.endDate != null &&
    data.endDate < data.startDate
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    });
  }
};

// ============================================================================
// Payout Window Create Schema
// For POST /admin/payout-window
// ============================================================================
export const payoutWindowCreateInputSchema = payoutWindowBaseSchema
  .superRefine((data, ctx) => {
    addWindowDateIssues(data, ctx);
  });

export type PayoutWindowCreateInput = z.infer<
  typeof payoutWindowCreateInputSchema
>;

// ============================================================================
// Payout Window Update Schema
// For PATCH /admin/payout-window/:id
// ============================================================================
export const payoutWindowUpdateInputSchema = payoutWindowBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    addWindowDateIssues(data, ctx);
  });

export type PayoutWindowUpdateInput = z.infer<
  typeof payoutWindowUpdateInputSchema
>;

// ============================================================================
// Payout Window Query Schema
// For GET /admin/payout-window
// ============================================================================
export const payoutWindowSortBySchema = z.enum([
  'periodMonth',
  'startDate',
  'endDate',
  'status',
  'completedAt',
  'createdAt',
  'updatedAt',
]);

export const payoutWindowQuerySchema = z
  .object({
    // --- Filters ---
    status: payoutWindowStatusSchema.optional(),

    // Payout month range (both ends inclusive and optional) — the unique key
    // most list views group by.
    periodFrom: dateSchema.optional(),
    periodTo: dateSchema.optional(),

    // Start-date range (both ends inclusive and optional).
    startDateFrom: dateSchema.optional(),
    startDateTo: dateSchema.optional(),

    // End-date range (both ends inclusive and optional) — pairs with the
    // `@@index([status, endDate])` lookup for overdue windows.
    endDateFrom: dateSchema.optional(),
    endDateTo: dateSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: payoutWindowSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .refine(
    (data) =>
      data.periodFrom == null ||
      data.periodTo == null ||
      data.periodTo >= data.periodFrom,
    {
      message: 'periodTo must be on or after periodFrom',
      path: ['periodTo'],
    },
  )
  .refine(
    (data) =>
      data.startDateFrom == null ||
      data.startDateTo == null ||
      data.startDateTo >= data.startDateFrom,
    {
      message: 'startDateTo must be on or after startDateFrom',
      path: ['startDateTo'],
    },
  )
  .refine(
    (data) =>
      data.endDateFrom == null ||
      data.endDateTo == null ||
      data.endDateTo >= data.endDateFrom,
    {
      message: 'endDateTo must be on or after endDateFrom',
      path: ['endDateTo'],
    },
  );

export type PayoutWindowQuery = z.infer<typeof payoutWindowQuerySchema>;
