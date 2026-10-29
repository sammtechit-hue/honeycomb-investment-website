import { z } from 'zod';
import { percentSchema } from './common.js';

// Create
// -------------------------------------------------------------------------

export const fixedRateCreateInputSchema = z.object({
  rate: percentSchema.optional(),
  label: z.string().trim().max(200, 'Label cannot exceed 200 characters').optional(),
  isActive: z.boolean().optional(),
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
