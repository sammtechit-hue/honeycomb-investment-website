import { z } from 'zod';
import { emailSchema, limitValidationSchema, maxAmountQuerySchema, minAmountQuerySchema, moneySchema, pageValidationSchema, phoneNumberSchema, searchValidationSchema, sortOrderSchema } from './common.js';

// Creating
export const roiCalculatorLeadCreateSchema = z.object({
    name: z.string().trim()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters'),
    phoneNumber: phoneNumberSchema,
    email: emailSchema.optional(),
    enteredAmount: moneySchema
})

export type RoiCalculatorLeadCreateSchema = z.infer<typeof roiCalculatorLeadCreateSchema>;




// For Admin
export const roiCalculatorLeadUpdateSchema = z.object({
    followedUp: z.boolean(),
})

export type RoiCalculatorLeadUpdateSchema = z.infer<typeof roiCalculatorLeadUpdateSchema>;

export const roiCalculatorLeadQuerySchema = z.object({
    search: searchValidationSchema,

    // Pagination
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // Filtering ranges
    minAmount: minAmountQuerySchema,
    maxAmount: maxAmountQuerySchema,

    // Sorting
    sortBy: z.enum(['name', 'phoneNumber', 'email', 'followedUp', 'createdAt',])
    .default('createdAt'),
    sortOrder: sortOrderSchema,
})

export type RoiCalculatorLeadQuerySchema = z.infer<typeof roiCalculatorLeadQuerySchema>;