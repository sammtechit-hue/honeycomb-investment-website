import { z } from 'zod';
import {
    limitValidationSchema,
    pageValidationSchema,
    percentSchema,
    queryBooleanSchema,
    searchValidationSchema,
    sortOrderSchema,
} from './common.js';


const DaySchema = z
    .coerce
    .number()
    .int('Cycle day must be a whole number')
    .min(1, 'Cycle day must be between 1 and 28')
    .max(28, 'Cycle day must be between 1 and 28');


const businessSettingsLabelSchema = z
    .string()
    .trim()
    .max(200, 'Label cannot exceed 200 characters');

// Create
// -------------------------------------------------------------------------
export const businessSettingsCreateInputSchema = z.object({
    rate: percentSchema.optional(),
    setcycleday: DaySchema.optional(),
    countingStartAfterDays: z
        .coerce
        .number()
        .int('Cycle day must be a whole number')
        .min(0, 'Cycle day must be at least 0').optional(),

    label: businessSettingsLabelSchema.optional(),
})

export type BusinessSettingsCreateInputSchema = z.infer<typeof businessSettingsCreateInputSchema>;


// Update
// -------------------------------------------------------------------------
export const businessSettingsUpdateInputSchema = z.object({
    rate: percentSchema.optional(),
    setcycleday: DaySchema.optional(),
    countingStartAfterDays: DaySchema.optional(),

    label: businessSettingsLabelSchema.optional(),
    isActive: z.boolean().optional(),
})

export type BusinessSettingsUpdateInputSchema = z.infer<typeof businessSettingsUpdateInputSchema>

// Query
// -------------------------------------------------------------------------
export const businessSettingsSortBySchema = z.enum([
    'rate',
    'setcycleday',
    'countingStartAfterDays',
    'isActive',
    'createdAt',
]);

export const businessSettingsQuerySchema = z.object({
    page: pageValidationSchema,
    limit: limitValidationSchema,

    sortBy: businessSettingsSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,

    isActive: queryBooleanSchema.optional(),
    search: searchValidationSchema,
});

export type BusinessSettingsQuery = z.infer<typeof businessSettingsQuerySchema>;