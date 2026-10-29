import { z } from 'zod';
import { limitValidationSchema, pageValidationSchema, percentSchema, queryBooleanSchema, searchValidationSchema, sortOrderSchema } from './common.js';

// Create
// -------------------------------------------------------------------------

export const fixedRateCreateInputSchema = z.object({
  rate: percentSchema.optional(),
  label: z.string().trim().max(200, 'Label cannot exceed 200 characters').optional(),
});

export type FixedRateCreateInput = z.infer<typeof fixedRateCreateInputSchema>;

// Update
// -------------------------------------------------------------------------

export const fixedRateUpdateInputSchema = z.object({
  rate: percentSchema.optional(),
  label: z.string().trim().max(200, 'Label cannot exceed 200 characters').optional(),
  isActive: z.boolean().optional(),
});

export type FixedRateUpdateInput = z.infer<typeof fixedRateUpdateInputSchema>;


// Query
// -------------------------------------------------------------------------

export const fixedRateSortBySchema = z.enum([
  'rate',
  'isActive',
  'createdAt',
]);

export const fixedRateQuerySchema = z.object({
  page: pageValidationSchema,
  limit: limitValidationSchema,

  sortBy: fixedRateSortBySchema.default('createdAt'),
  sortOrder: sortOrderSchema,

  isActive: queryBooleanSchema.optional(),
  search: searchValidationSchema,
});