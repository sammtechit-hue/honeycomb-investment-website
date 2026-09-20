import { z } from 'zod';

export const uuidSchema = z.string().uuid('Must be a valid UUID');

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

export const bankAccountSchema = z
  .object({
    selectedBank: bankSelectedSchema,
    bankName: bankNameSchema,
    accountName: accountNameSchema,
    accountNumber: accountNumberSchema,
    routingNumber: routingNumberSchema.optional(),
    accountType: bankAccountTypeSchema.optional(),
    branchName: branchNameSchema.optional(),
  })
  // Cross-field rule: non-city-bank accounts require a routing number for BEFTN
  .refine(
    (data) => data.selectedBank === 'city_bank' || !!data.routingNumber,
    {
      message: 'Routing number is required for banks other than City Bank',
      path: ['routingNumber'],
    },
  );

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
