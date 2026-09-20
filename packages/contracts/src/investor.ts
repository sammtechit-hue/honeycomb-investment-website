import { z } from 'zod';
import {
  bankAccountSchema,
  bankAccountTypeSchema,
  bankSelectedSchema,
  fileUrlSchema,
  phoneNumberSchema,
} from './common.js';

export {
  bankAccountSchema,
  bankAccountTypeSchema,
  bankSelectedSchema,
  type BankAccountInput,
} from './common.js';

// ---------------------------------------------------------------------------
// Enum mirrors (kept in sync with prisma schema — avoids a runtime dep on
// @prisma/client in the shared contracts package)
// ---------------------------------------------------------------------------
export const investorStatusSchema = z.enum([
  'pending',
  'uploaded_kyc',
  'active',
  'suspended',
]);


export const investorCategorySchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'diamond',
  'platinum',
  'titanium',
]);


// Mirrors Prisma `VerificationStatus` enum (used for KYC checking)
export const verificationStatusSchema = z.enum([
  'pending',
  'verified',
  'rejected',
]);

// NomineeSchema
export const nomineeSchema = z.object({
  nomineeName: z
    .string()
    .trim()
    .min(2, 'Nominee name must be at least 2 characters')
    .max(150, 'Nominee name cannot exceed 150 characters'),
  nomineePhone: phoneNumberSchema,

  relation: z
    .string()
    .trim()
    .min(2, 'Relation must be at least 2 characters')
    .max(50, 'Relation cannot exceed 50 characters'),
  nomineeNidFront: fileUrlSchema.optional(),
  nomineeNidBack: fileUrlSchema.optional(),
  nomineePhoto: fileUrlSchema.optional(),
});

export type NomineeInput = z.infer<typeof nomineeSchema>;

// KYC Document
export const kycDocumentsSchema = z.object({
  nidFront: fileUrlSchema,
  nidBack: fileUrlSchema,
  photo: fileUrlSchema,
});

export type KycDocumentsInput = z.infer<typeof kycDocumentsSchema>;




// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------


export const investorCreateInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 5 characters')
    .max(150, 'Full name cannot exceed 150 characters'),
  address: z
    .string()
    .trim()
    .max(500, 'Address cannot exceed 500 characters')
    .optional(),
  profession: z
    .string()
    .trim()
    .max(150, 'Profession cannot exceed 150 characters')
    .optional(),
  workplace: z
    .string()
    .trim()
    .max(150, 'Workplace cannot exceed 150 characters')
    .optional(),

  // Nested required objects — created in the same transaction as the Investor
  bankAccount: bankAccountSchema,
  nominee: nomineeSchema,
  kycDocuments: kycDocumentsSchema,

  // Optional: investor can join without being referred
  referralCode: z
    .string()
    .trim()
    .min(7, 'Referral code must be at least 7 characters')
    .max(20, 'Referral code cannot exceed 20 characters')
    .optional(),
});

export type InvestorCreateInput = z.infer<typeof investorCreateInputSchema>;

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const investorUpdateInputSchema = investorCreateInputSchema
  // .omit({
  //   kycDocuments: true,   // KYC changes go through re-verification
  //   bankAccount: true,    // Bank changes go through a dedicated endpoint
  //   nominee: true,        // Nominee changes go through a dedicated endpoint
  //   referralCode: true,   // Cannot change referrer after registration
  // })
  .partial();

export type InvestorUpdateInput = z.infer<typeof investorUpdateInputSchema>;


// Query (findAll — search, filter, pagination, sorting)

// /api/admin/investors?search=Rahman&status=active&category=gold&page=1&limit=15&sortBy=fullName&sortOrder=asc

export const investorQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: investorStatusSchema.optional(),
  category: investorCategorySchema.optional(),

  // NEW: Filters for administrative bank profiling & matching
  selectedBank: bankSelectedSchema.optional(),
  accountType: bankAccountTypeSchema.optional(),

  // NEW: Verification state filter for KYC submissions
  kycVerificationStatus: verificationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  
  // Safer — prevents garbage strings reaching Prisma
  approvedBy: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['fullName', 'email', 'category', 'status', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  minTotalInvestment: z.coerce.number().min(0).default(0),
  maxTotalInvestment: z.coerce.number().min(0).default(100_000_000),
})
  // Cross-field rule: max must be >= min
  .refine((data) => data.maxTotalInvestment >= data.minTotalInvestment, {
    message: 'maxTotalInvestment must be greater than or equal to minTotalInvestment',
    path: ['maxTotalInvestment'],
  });

export type InvestorQuery = z.infer<typeof investorQuerySchema>;