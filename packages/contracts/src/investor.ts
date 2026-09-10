import { z } from 'zod';

// Client-submittable fields only. id, status, category, approvedById and
// adminId are assigned by the backend (registration/approval flow), never
// by the form that fills this schema in — see Investor model in schema.prisma.
export const investorCreateInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters'),
  email: z.string().trim().email('Invalid email address').max(150).optional(),
  address: z.string().trim().max(150).optional(),
  profession: z.string().trim().max(150).optional(),
  workplace: z.string().trim().max(150).optional(),
});

export type InvestorCreateInput = z.infer<typeof investorCreateInputSchema>;

export const investorUpdateInputSchema = investorCreateInputSchema.partial();

export type InvestorUpdateInput = z.infer<typeof investorUpdateInputSchema>;
