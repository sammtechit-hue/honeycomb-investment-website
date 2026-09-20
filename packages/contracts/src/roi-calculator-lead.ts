import { z } from 'zod';
import { emailSchema, moneySchema, phoneNumberSchema } from './common.js';

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