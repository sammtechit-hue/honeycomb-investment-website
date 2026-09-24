import { z } from 'zod';

export const uuidSchema = z.string().uuid('Must be a valid UUID');

export const dateSchema = z.coerce.date();

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const percentSchema = z
  .coerce
  .number()
  .min(0, 'Rate cannot be negative')
  .max(100, 'Rate cannot exceed 100%')
  .transform((val) => Math.round(val * 100) / 100);

export const incomingPaymentMethodSchema = z.enum(
  ['bkash', 'nagad', 'rocket', 'bank_transfer'],
  {
    message:
      'Payment method must be one of: bkash, nagad, rocket, bank_transfer',
  },
);

export const incomingPaymentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'overdue',
]);

export const bankExportFormatSchema = z.enum(['cbl', 'beftn'], {
  message: 'Export format must be one of: cbl, beftn',
});

export const nonNegativeNumberSchema = z.coerce.number().min(0);

export const minAmountQuerySchema = nonNegativeNumberSchema.default(0);

export const maxAmountQuerySchema = nonNegativeNumberSchema.default(100_000_000);

export const moneySchema = z
  .coerce
  .number()
  .positive('Amount must be greater than zero')
  .max(999_999_999.99, 'Amount exceeds maximum allowed value')
  // Round to 2 decimal places to match Decimal(14,2)
  // Step	Calculation	Result
  // 1. Multiply by 100	3.14159 * 100	314.159
  // 2. Math.round()	Math.round(314.159)	314
  // 3. Divide by 100	314 / 100	3.14 ✅
  .transform((val) => Math.round(val * 100) / 100);

export const fileUrlSchema = z
  .string()
  .trim()
  .url('File URL must be a valid URL')
  .max(500, 'File URL cannot exceed 500 characters');

export const emailSchema = z
  .string()
  .trim()
  .max(150, 'Email must not exceed 150 characters')
  .email('Invalid email address');

export const phoneNumberSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  // Remove spaces, dashes, parentheses (common user input)
  .transform((val) => val.replace(/[\s\-()]/g, ''))
  // Now enforce the BD mobile format
  .refine(
    (val) => /^(?:\+?880|0)1[3-9]\d{8}$/.test(val),
    { message: 'Phone number must be a valid Bangladeshi mobile number' },
  )
  // Normalize to a single canonical format: 01XXXXXXXXX
  .transform((val) => {
    const digits = val.replace(/^\+?880/, '').replace(/^0/, '');
    return `0${digits}`;
  });

// Plaintext credential, handed to the hashing service. It is never persisted
// or returned as-is — Prisma stores only `User.passwordHash`.
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(72, 'Password cannot exceed 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

// Query strings arrive as text, so "true"/"false" is mapped to a real boolean.
// (z.coerce.boolean() is not used on purpose — Boolean('false') is true.)
export const queryBooleanSchema = z
  .enum(['true', 'false'], { message: 'Value must be "true" or "false"' })
  .transform((val) => val === 'true');

// Mirrors Prisma `BankSelected` enum
export const bankSelectedSchema = z.enum(['city_bank', 'others']);

// Mirrors Prisma `BankAccountType` enum
export const bankAccountTypeSchema = z.enum(['savings', 'current']);




// For reuse of code
export const bankNameSchema = z
  .string()
  .trim()
  .min(2, 'Bank name must be at least 2 characters')
  .max(100, 'Bank name cannot exceed 100 characters');

export const accountNameSchema = z
  .string()
  .trim()
  .min(2, 'Account name must be at least 2 characters')
  .max(150, 'Account name cannot exceed 150 characters')
  .regex(
    /^[a-zA-Z\s.\-']+$/,
    'Account name can only contain letters, spaces, hyphens, periods, and apostrophes',
  );

export const accountNumberSchema = z
  .string()
  .trim()
  .min(6, 'Account number must be at least 6 digits')
  .max(50, 'Account number cannot exceed 50 characters')
  .regex(/^[0-9\-]+$/, 'Account number can only contain digits and hyphens');

export const routingNumberSchema = z
  .string()
  .trim()
  .length(9, 'Routing number must be exactly 9 digits')
  .regex(/^\d+$/, 'Routing number must contain only digits');

export const branchNameSchema = z
  .string()
  .trim()
  .max(150, 'Branch name cannot exceed 150 characters');

// Cross-field rule: non-City-Bank accounts require a routing number for BEFTN.
// Stated so it also holds on `.partial()` schemas — an absent `selectedBank`
// means "unchanged", not "no routing number", so the rule stays quiet on a
// partial body that does not touch the bank selection at all.
export const bankAccountRoutingRule = (data: {
  selectedBank?: z.infer<typeof bankSelectedSchema>;
  routingNumber?: string;
}) => !!data.routingNumber || data.selectedBank !== 'others';

// Plain field rules for a payout account. Kept as a ZodObject (unrefined) so
// callers can `.extend()` / `.omit()` them — e.g. the dedicated
// InvestorBankAccount contract, where the account is its own resource.
// `bankAccountSchema` adds the cross-field rule on top.
export const bankAccountFieldsSchema = z.object({
  selectedBank: bankSelectedSchema,
  bankName: bankNameSchema,
  accountName: accountNameSchema,
  accountNumber: accountNumberSchema,
  routingNumber: routingNumberSchema.optional(),
  accountType: bankAccountTypeSchema.optional(),
  branchName: branchNameSchema.optional(),
});

export const bankAccountSchema = bankAccountFieldsSchema.refine(
  bankAccountRoutingRule,
  {
    message: 'Routing number is required for banks other than City Bank',
    path: ['routingNumber'],
  },
);

export type BankAccountInput = z.infer<typeof bankAccountSchema>;


export const ipAddressSchema = z
  .string()
  .trim()
  .ip({ message: 'Must be a valid IPv4 or IPv6 address' });


export const pageValidationSchema = z.coerce
      .number()
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .default(1);

export const limitValidationSchema = z.coerce
      .number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(10);

export const searchValidationSchema = z
      .string()
      .trim()
      .max(150, 'Search cannot exceed 150 characters')
      .optional();