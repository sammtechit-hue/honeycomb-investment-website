import { z } from 'zod';

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

export const KycDocType = z.enum(
  ['nid', 'photo', 'other'],
  {
    message: 'Document type must be one of: nid, photo, other',
  },
);


// ============================================================================
// KYC Document Schema
// ============================================================================

export const kycDocumentSchema = z.object({
  docType: KycDocType,
  fileUrl: z
    .string()
    .trim()
    .url('File URL must be a valid URL')
    .max(500, 'File URL cannot exceed 500 characters'),
  // notes: z
  //   .string()
  //   .trim()
  //   .max(255, 'Notes cannot exceed 255 characters')
  //   .optional(),
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------


export const investorCreateInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(5, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters')
    .regex(
      /^[a-zA-Z\s.\-']+$/,
      "Full name can only contain letters, spaces, hyphens, periods, and apostrophes",
    ),
  // email: z
  //   .string()
  //   .trim()
  //   .email('Invalid email address')
  //   .max(150, 'Email cannot exceed 150 characters')
  //   .toLowerCase(),
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
  kycDocuments: z
    .array(kycDocumentSchema)
    .min(2, 'At least 2 KYC documents are required (NID front, NID back, and photo)')
    .max(7, 'Cannot upload more than 7 KYC documents at once'),
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
  .omit({ kycDocuments: true, referralCode: true }) // Can't update KYC or referral after registration
  .partial();

export type InvestorUpdateInput = z.infer<typeof investorUpdateInputSchema>;

// ---------------------------------------------------------------------------
// Query (findAll — search, filter, pagination, sorting)
// ---------------------------------------------------------------------------

export const investorQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: investorStatusSchema.optional(),
  category: investorCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  approvedBy: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['fullName', 'email', 'category', 'status', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  minTotalInvestment: z.coerce.number().int().default(0),
  maxTotalInvestment: z.coerce.number().int().default(100000000),
});

export type InvestorQuery = z.infer<typeof investorQuerySchema>;