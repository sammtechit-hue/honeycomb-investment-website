import { z } from 'zod';
import { moneySchema } from './investment.js';

// const moneySchema = z
//     .coerce
//     .number()
//     .positive('Amount must be greater than zero')
//     .max(999_999_999.99, 'Amount exceeds maximum allowed value')
//     // Round to 2 decimal places to match Decimal(14,2)
//     // Step	Calculation	Result
//     // 1. Multiply by 100	3.14159 * 100	314.159
//     // 2. Math.round()	Math.round(314.159)	314
//     // 3. Divide by 100	314 / 100	3.14 ✅
//     .transform((val) => Math.round(val * 100) / 100);


// Creating
export const roiCalculatorLeadCreateSchema = z.object({
    name: z.string().trim()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters'),
    phoneNumber: z
        .string({ required_error: 'Phone number is required' })
        .trim()
        // Remove spaces, dashes, parentheses (common user input)
        .transform((val) => val.replace(/[\s\-()]/g, ''))
        // Now enforce the BD mobile format
        .refine(
            (val) => /^(?:\+?880|0)1[3-9]\d{8}$/.test(val),
            { message: 'Phone number must be a valid Bangladeshi mobile number' }
        )
        // Normalize to a single canonical format: 01XXXXXXXXX
        .transform((val) => {
            const digits = val.replace(/^\+?880/, '').replace(/^0/, '');
            return `0${digits}`;
        }),
    email: z.string().trim().max(150, "Email must not exceed 150 characters").email("Invalid email address").optional(),
    enteredAmount: moneySchema
})

export type RoiCalculatorLeadCreateSchema = z.infer<typeof roiCalculatorLeadCreateSchema>;




// For Admin
export const roiCalculatorLeadUpdateSchema = z.object({
    followedUp: z.boolean(),
})

export type RoiCalculatorLeadUpdateSchema = z.infer<typeof roiCalculatorLeadUpdateSchema>;

export const roiCalculatorLeadQuerySchema = z.object({
    search: z.string().trim().optional(),

    // Pagination
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),

    // Filtering ranges
    minAmount: z.coerce.number().min(0).default(0),
    maxAmount: z.coerce.number().min(0).default(100_000_000),

    // Sorting
    sortBy: z.enum(['name', 'phoneNumber', 'email', 'followedUp', 'createdAt',])
    .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type RoiCalculatorLeadQuerySchema = z.infer<typeof roiCalculatorLeadQuerySchema>;