import { z } from 'zod';
import { uuidSchema } from './common.js';
// The nominee field rules (name, BD phone, relation, NID/photo URLs) already
// exist for nested investor registration — reuse them as the single source of
// truth instead of duplicating them here.
import { nomineeSchema } from './investor.js';

// ============================================================================
// Nominee — shared zod contracts
// Source of truth: Prisma model `Nominee` (schema.prisma §5)
// 1:1 with Investor (investorId is unique), so creating a second nominee for
// the same investor is rejected by the database.
// ============================================================================

// ============================================================================
// Base Nominee Schema
// ============================================================================
// Kept as a ZodObject so the update schema can call `.partial()`.
// ============================================================================

const nomineeBaseSchema = nomineeSchema.extend({
  // The investor this nominee belongs to (unique FK in Prisma).
  investorId: uuidSchema,
});

// ============================================================================
// Nominee Create Schema
// For POST /nominee
// ============================================================================

export const nomineeCreateInputSchema = nomineeBaseSchema;

export type NomineeCreateInput = z.infer<typeof nomineeCreateInputSchema>;

// ============================================================================
// Nominee Update Schema
// For PATCH /nominee/:id
// ============================================================================
// All fields optional. `investorId` is intentionally omittable here — moving a
// nominee between investors is an admin-level operation that should go
// through an explicit, audited flow rather than a generic PATCH.
// ============================================================================

export const nomineeUpdateInputSchema = nomineeBaseSchema.partial();

export type NomineeUpdateInput = z.infer<typeof nomineeUpdateInputSchema>;

// ============================================================================
// Nominee Query Schema
// For GET /nominee
// ============================================================================

export const nomineeSortBySchema = z.enum([
  'nomineeName',
  'relation',
  'nomineePhone',
]);

export const nomineeQuerySchema = z.object({
  // Free-text search over the nominee name and relation.
  search: z
    .string()
    .trim()
    .max(150, 'Search cannot exceed 150 characters')
    .optional(),

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
  // The model has no createdAt; sort by stored columns only.
  sortBy: nomineeSortBySchema.default('nomineeName'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type NomineeQuery = z.infer<typeof nomineeQuerySchema>;
