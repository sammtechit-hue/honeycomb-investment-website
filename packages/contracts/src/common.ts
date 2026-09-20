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
