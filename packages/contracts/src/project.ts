import { z } from 'zod';
import { moneySchema } from './investment.js';

// ============================================================================
// Project Status
// Mirrors Prisma `ProjectStatus` enum
// ============================================================================

export const projectStatusSchema = z.enum(
  ['DRAFT', 'OPEN', 'FULL', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  {
    message:
      'Project status must be one of: DRAFT, OPEN, FULL, PAUSED, COMPLETED, CANCELLED',
  },
);

// ============================================================================
// Base Project Schema
// ============================================================================
// Keep this as a ZodObject.
// Do NOT use .refine() here because we need to call .partial()
// on this schema later for the update schema.
// ============================================================================

const projectBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Project name must be at least 3 characters')
    .max(150, 'Project name cannot exceed 150 characters'),

  description: z
    .string()
    .trim()
    .max(5000, 'Description cannot exceed 5000 characters'),

  status: projectStatusSchema,

  // Money fields — Decimal(18, 2) in Prisma
  minimumInvestment: moneySchema,
  maximumInvestment: moneySchema.default(100_000_000), //10 koti,
  targetAmount: moneySchema.optional(),

  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),

  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

// ============================================================================
// Project Create Schema
// For POST /projects
// ============================================================================

export const projectCreateInputSchema = projectBaseSchema.refine(
  (data) =>
    data.maximumInvestment === undefined ||
    data.maximumInvestment >= data.minimumInvestment,
  {
    message:
      'Maximum investment must be greater than or equal to minimum investment',
    path: ['maximumInvestment'],
  },
);

export type ProjectCreateInput = z.infer<
  typeof projectCreateInputSchema
>;

// ============================================================================
// Project Update Schema
// For PATCH /projects/:id
// ============================================================================

export const projectUpdateInputSchema = projectBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    // ----------------------------------------------------------
    // maximumInvestment >= minimumInvestment
    // Only validate when BOTH values are provided.
    // ----------------------------------------------------------

    if (
      data.minimumInvestment != null &&
      data.maximumInvestment != null &&
      data.maximumInvestment < data.minimumInvestment
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'maximumInvestment must be greater than or equal to minimumInvestment',
        path: ['maximumInvestment'],
      });
    }

    // ----------------------------------------------------------
    // targetAmount >= minimumInvestment
    // Only validate when BOTH values are provided.
    // ----------------------------------------------------------

    if (
      data.minimumInvestment != null &&
      data.targetAmount != null &&
      data.targetAmount < data.minimumInvestment
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'targetAmount must be greater than or equal to minimumInvestment',
        path: ['targetAmount'],
      });
    }

    // ----------------------------------------------------------
    // endDate > startDate
    // Only validate when BOTH dates are provided.
    // ----------------------------------------------------------

    if (
      data.startDate != null &&
      data.endDate != null &&
      data.endDate <= data.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be after startDate',
        path: ['endDate'],
      });
    }
  });

export type ProjectUpdateInput = z.infer<
  typeof projectUpdateInputSchema
>;


// Project Query
export const projectQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: projectStatusSchema.optional(),

  // Visibility / activity toggles
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Investment amount range (matched against minimumInvestment)
  minInvestment: z.coerce.number().min(0).default(0),
  maxInvestment: z.coerce.number().min(0).default(100_000_000), //10 koti

  // Sorting
  sortBy: z
    .enum([
      'name',
      'status',
      'minimumInvestment',
      'maximumInvestment',
      'targetAmount',
      'totalInvestedAmount',
      'startDate',
      'createdAt',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})// Cross-field rule: max must be >= min
  .refine((data) => data.maxInvestment >= data.minInvestment, {
    message: 'maxInvestment must be greater than or equal to minInvestment',
    path: ['maxInvestment'],
  });

export type ProjectQuery = z.infer<typeof projectQuerySchema>;