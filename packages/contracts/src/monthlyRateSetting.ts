import { z } from 'zod';
import {
  limitValidationSchema,
  pageValidationSchema,
  percentSchema,
  sortOrderSchema,
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
  // Month name, e.g. "January" — case-insensitive, normalized to lowercase.
  month: monthNameSchema,
  year: yearSchema,
  // Decimal(5,2) — the monthly profit rate, e.g. 5.5 (%).
  rate: percentSchema,
});

export type MonthlyRateSettingCreateInput = z.infer<
  typeof monthlyRateSettingCreateInputSchema
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

export const monthlyRateSettingQuerySchema = z.object({
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
