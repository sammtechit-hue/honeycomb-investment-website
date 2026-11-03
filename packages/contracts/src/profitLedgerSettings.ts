import { z } from 'zod';
import { limitValidationSchema, pageValidationSchema, queryBooleanSchema, searchValidationSchema, sortOrderSchema } from './common.js';

// Day-of-month for the profit ledger cycle day (1–28 to stay valid in every month).
const profitLedgerCycleDaySchema = z
  .coerce
  .number()
  .int('Cycle day must be a whole number')
  .min(1, 'Cycle day must be between 1 and 28')
  .max(28, 'Cycle day must be between 1 and 28');

// Create
// -------------------------------------------------------------------------

export const profitLedgerSettingsCreateInputSchema = z.object({
  setcycleday: profitLedgerCycleDaySchema,
  label: z.string().trim().max(200, 'Label cannot exceed 200 characters').optional(),
});

export type ProfitLedgerSettingsCreateInput = z.infer<typeof profitLedgerSettingsCreateInputSchema>;

// Update
// -------------------------------------------------------------------------

export const profitLedgerSettingsUpdateInputSchema = z.object({
  setcycleday: profitLedgerCycleDaySchema.optional(),
  label: z.string().trim().max(200, 'Label cannot exceed 200 characters').optional(),
  isActive: z.boolean().optional(),
});

export type ProfitLedgerSettingsUpdateInput = z.infer<typeof profitLedgerSettingsUpdateInputSchema>;

// Query
// -------------------------------------------------------------------------

export const profitLedgerSettingsSortBySchema = z.enum([
  'setcycleday',
  'isActive',
  'createdAt',
]);

export const profitLedgerSettingsQuerySchema = z.object({
  page: pageValidationSchema,
  limit: limitValidationSchema,

  sortBy: profitLedgerSettingsSortBySchema.default('createdAt'),
  sortOrder: sortOrderSchema,

  isActive: queryBooleanSchema.optional(),
  search: searchValidationSchema,
});
