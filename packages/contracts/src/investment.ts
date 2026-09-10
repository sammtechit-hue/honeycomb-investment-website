import { z } from 'zod';

export const investmentTypeSchema = z.enum(['fixed', 'unfixed']);
export const disbursementPeriodSchema = z.enum([
  'monthly',
  'quarterly',
  'half_yearly',
  'yearly',
]);

// Client-submittable fields only. status, disbursementSlot, receivedById,
// authorizedById and the document/voucher flags are set by admin ops
// workflows after creation, not on the create form — see Investment model
// in schema.prisma.
export const investmentCreateInputSchema = z
  .object({
    investorId: z.string().uuid('Investor is required'),
    projectId: z.string().uuid('Project is required'),
    investmentDate: z.coerce.date().optional(),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    investmentType: investmentTypeSchema,
    // Only meaningful for fixed-rate investments — enforced below since a
    // plain object shape can't express "required if type === 'fixed'".
    fixedRate: z.coerce.number().min(0).max(100).optional(),
    // Confirmed: an explicit period must be 3+ months.
    investmentPeriodMonths: z.coerce.number().int().min(3).optional().default(3),
    disbursementPeriod: disbursementPeriodSchema,
    agreementPlace: z.string().trim().max(150).optional(),
    specialInstruction: z.string().trim().optional(),
  })
  .refine((data) => data.investmentType !== 'fixed' || data.fixedRate !== undefined, {
    message: 'fixedRate is required when investmentType is "fixed"',
    path: ['fixedRate'],
  });

export type InvestmentCreateInput = z.infer<typeof investmentCreateInputSchema>;

// .partial() can't follow .refine() directly (refine returns a ZodEffects,
// not a ZodObject), so the update schema re-declares the same shape as
// partial and re-applies the same conditional rule.
export const investmentUpdateInputSchema = z
  .object({
    investorId: z.string().uuid('Investor is required'),
    projectId: z.string().uuid('Project is required'),
    investmentDate: z.coerce.date().optional(),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    investmentType: investmentTypeSchema,
    fixedRate: z.coerce.number().min(0).max(100).optional(),
    investmentPeriodMonths: z.coerce.number().int().min(3).optional().default(3),
    disbursementPeriod: disbursementPeriodSchema,
    agreementPlace: z.string().trim().max(150).optional(),
    specialInstruction: z.string().trim().optional(),
  })
  .partial()
  .refine((data) => data.investmentType !== 'fixed' || data.fixedRate !== undefined, {
    message: 'fixedRate is required when investmentType is "fixed"',
    path: ['fixedRate'],
  });

export type InvestmentUpdateInput = z.infer<typeof investmentUpdateInputSchema>;
