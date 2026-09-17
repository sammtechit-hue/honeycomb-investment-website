import { z } from 'zod';

export const investmentTypeSchema = z.enum(
  ['fixed', 'unfixed'],
  {
    message: 'Investment type must be one of: fixed, unfixed',
  },
);
// Mirrors Prisma `InvestmentStatus` enum
export const investmentStatusSchema = z.enum(['pending', 'active']);

export const disbursementPeriodSchema = z.enum(
  ['monthly', 'quarterly', 'half_yearly', 'yearly'],
  {
    message:
      'Disbursement period must be one of: monthly, quarterly, half_yearly, yearly',
  },
);

// Mirrors Prisma `IncomingPaymentMethod`
export const incomingPaymentMethodSchema = z.enum(
  ['bkash', 'nagad', 'rocket', 'bank_transfer'],
  {
    message:
      'Payment method must be one of: bkash, nagad, rocket, bank_transfer',
  },
);

// Mirrors Prisma `IncomingPaymentStatus`
export const incomingPaymentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'overdue',
]);

const uuidSchema = z.string().uuid('Must be a valid UUID');

const moneySchema = z
  .coerce
  .number()
  .positive('Amount must be greater than zero')
  .max(999_999_999_999.99, 'Amount exceeds maximum allowed value')
  // Round to 2 decimal places to match Decimal(14,2)
  // Step	Calculation	Result
  // 1. Multiply by 100	3.14159 * 100	314.159
  // 2. Math.round()	Math.round(314.159)	314
  // 3. Divide by 100	314 / 100	3.14 ✅
  .transform((val) => Math.round(val * 100) / 100);

const fileUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .max(500, 'URL cannot exceed 500 characters');


// InvestmentCreateInputSchema
export const investmentCreateInputSchema = z
  .object({
    projectId: uuidSchema,
    investmentDate: z.coerce.date().optional(),
    amount: moneySchema,
    investmentType: investmentTypeSchema,
    // Only meaningful for fixed-rate investments — enforced below since a
    // Confirmed: an explicit period must be 3+ months.
    investmentPeriodMonths: z.coerce
      .number()
      .int('Investment period must be a whole number of months')
      .min(1, 'Minimum investment period is 1 month')
      .default(3),
    disbursementPeriod: disbursementPeriodSchema,
  })

export type InvestmentCreateInput = z.infer<typeof investmentCreateInputSchema>;


// Percentage rate — Prisma Decimal(5,2) → max 999.99
const ratePercentSchema = z
  .coerce
  .number()
  .min(0, 'Rate cannot be negative')
  .max(100, 'Rate cannot exceed 100%')

  //For getting 2 number after decimal point
  .transform((val) => Math.round(val * 100) / 100);


// For admin 
export const investmentAdminUpdateInputSchema = investmentCreateInputSchema
  .extend({
    status: investmentStatusSchema.optional(),
    // rate is intentionally excluded — admin sets it during approval
    rate: ratePercentSchema.optional(),
    agreementEndDate: z.coerce.date().optional(),
    agreementPlace: z.string().trim().max(150).optional(),
    deedOffical: z.string().trim().optional(),
    deedGoverment: z.string().trim().optional(),

    // --- Physical Items Tracking ---
    chequeGiven: z.boolean().optional(),
    cashVoucharGiven: z.boolean().optional(),

    souvenirGiven: z.boolean().optional(),
    isSouvenirApplicable: z.boolean().optional(),

    certificateGiven: z.boolean().optional(),
    isCertificateApplicable: z.boolean().optional(),

    // --- Notes ---
    specialInstruction: z
      .string()
      .trim()
      .max(1000, 'Special instruction cannot exceed 1000 characters')
      .optional(),
  })
  .partial();

export type InvestmentAdminUpdateInputSchema = z.infer<typeof investmentAdminUpdateInputSchema>;


// For investor
export const investmentUpdateInputSchema = investmentCreateInputSchema
  .pick({
    investmentPeriodMonths: true,
    disbursementPeriod: true,
  })
  .partial();

export type InvestmentUpdateInput = z.infer<
  typeof investmentUpdateInputSchema
>;

// For query
export const investmentQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: investmentStatusSchema.optional(),
  investmentType: investmentTypeSchema.optional(),
  disbursementPeriod: disbursementPeriodSchema.optional(),
  projectId: uuidSchema.optional(),
  paymentMethod: incomingPaymentMethodSchema.optional(),
  paymentStatus: incomingPaymentStatusSchema.optional(),
  paymentAmount: z.coerce.number().min(0).optional(),
  investorId: uuidSchema.optional(),

  // Filtering ranges
  minAmount: z.coerce.number().min(0).default(0),
  maxAmount: z.coerce.number().min(0).default(100_000_000),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Sorting
  sortBy: z
    .enum([
      'amount',
      'rate',
      'investmentDate',
      'investmentPeriodMonths',
      'status',
      'paymentMethod',
      'paymentStatus',
      'createdAt',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})