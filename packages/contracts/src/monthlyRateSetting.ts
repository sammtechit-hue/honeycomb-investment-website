import { z } from 'zod';
import {
  limitValidationSchema,
  pageValidationSchema,
  percentSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

export const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

export const monthNameSchema = z
  .string({ required_error: 'month is required' })
  .trim()
  .toLowerCase()
  .refine(
    (value): value is (typeof MONTH_NAMES)[number] =>
      (MONTH_NAMES as readonly string[]).includes(value),
    { message: 'month must be a valid month name (January–December)' },
  );

export const yearSchema = z.coerce
  .number()
  .int('Year must be a whole number')

export const rateSettingStatusSchema = z.enum(['active', 'inactive']);

// Create
// -------------------------------------------------------------------------

export const monthlyRateSettingCreateInputSchema = z.object({
  // Rates are scoped per project; a setting applies to one project's
  // unfixed investments in that month.
  projectId: uuidSchema,
  // Month name, e.g. "January" — case-insensitive, normalized to lowercase.
  month: monthNameSchema,
  year: yearSchema,
  // Decimal(5,2) — the monthly profit rate, e.g. 5.5 (%).
  rate: percentSchema,
});

export type MonthlyRateSettingCreateInput = z.infer<
  typeof monthlyRateSettingCreateInputSchema
>;

// Create one monthlyRateSetting For multiple project
// -------------------------------------------------------------------------
export const monthlyRateSettingsMultipleProject = z.object({
  projectIds: z
    .array(z.string().uuid('Each project ID must be a valid UUID'))
    .min(1, 'At least one project must be provided'),
  month: monthNameSchema,
  year: yearSchema,
  rate: percentSchema,
}).superRefine((data, ctx) => {
  const uniqueProjectIds = new Set(data.projectIds);

  if (uniqueProjectIds.size !== data.projectIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['projectIds'],
      message: 'Duplicate project IDs are not allowed',
    });
  }
});

export type MonthlyRateSettingsMultipleProject = z.infer<
  typeof monthlyRateSettingsMultipleProject
>;

// Update
// -------------------------------------------------------------------------

export const monthlyRateSettingUpdateInputSchema = z.object({
  isActive: z.boolean().optional(),
  rate: percentSchema.optional(),
});

export type MonthlyRateSettingUpdateInput = z.infer<
  typeof monthlyRateSettingUpdateInputSchema
>;

// Query
// -------------------------------------------------------------------------

export const monthlyRateSettingSortBySchema = z.enum([
  'periodMonth',
  'ratePercent',
  'isActive',
  'setAt',
]);

const emptyToUndefined = (value: unknown) =>
  value === '' ? undefined : value;

export const monthlyRateSettingQuerySchema = z.object({
  // Filter to one project's rate settings.
  projectId: z.preprocess(emptyToUndefined, uuidSchema.optional()),
  status: rateSettingStatusSchema.optional(),
  // --- Pagination ---
  page: pageValidationSchema,
  limit: limitValidationSchema,

  // --- Sorting ---
  sortBy: monthlyRateSettingSortBySchema.default('periodMonth'),
  sortOrder: sortOrderSchema,
});

export type MonthlyRateSettingQuery = z.infer<
  typeof monthlyRateSettingQuerySchema
>;
