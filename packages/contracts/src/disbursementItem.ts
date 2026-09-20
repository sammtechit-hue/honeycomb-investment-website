import { z } from 'zod';
import {
  accountNameSchema,
  accountNumberSchema,
  bankAccountTypeSchema,
  bankNameSchema,
  branchNameSchema,
  moneySchema,
  routingNumberSchema,
  uuidSchema,
} from './common.js';

// Mirrors Prisma `ExportFormat` — file format of this single line item.
export const exportFormatSchema = z.enum(['cbl', 'beftn'], {
  message: 'Export format must be one of: cbl, beftn',
});


const disbursementItemBaseSchema = z.object({
  // Why the investor is being paid — VarChar(150) in Prisma.
  reason: z
    .string()
    .trim()
    .min(5, 'Reason is required')
    .max(150, 'Reason cannot exceed 150 characters'),

  // Payout amount — Decimal(14, 2) in Prisma (rounded to 2 decimals by
  // moneySchema).
  amount: moneySchema,

  // Export file format for this line item.
  exportFormat: exportFormatSchema,

  // Free-form admin note — VarChar(255) in Prisma.
  remarks: z
    .string()
    .trim()
    .max(255, 'Remarks cannot exceed 255 characters')
    .optional(),

  // --- Relations (all required in Prisma) ---
  investmentId: uuidSchema,
  investorId: uuidSchema,
  batchId: uuidSchema,

  // later changes their bank account) ---
  snapshotBankName: bankNameSchema,
  snapshotAccountName: accountNameSchema,
  snapshotAccountNumber: accountNumberSchema,
  snapshotRoutingNumber: routingNumberSchema.optional(),
  snapshotAccountType: bankAccountTypeSchema.optional(),
  branchName: branchNameSchema.optional(),
});


export const disbursementItemCreateInputSchema = disbursementItemBaseSchema;

export type DisbursementItemCreateInput = z.infer<
  typeof disbursementItemCreateInputSchema
>;

export const disbursementItemUpdateInputSchema =
  disbursementItemBaseSchema.partial();

export type DisbursementItemUpdateInput = z.infer<
  typeof disbursementItemUpdateInputSchema
>;

// Disbursement Item Query Schema
// For GET /disbursement-item and GET /admin/disbursement-item

export const disbursementItemSortBySchema = z.enum([
  'amount',
  'exportFormat',
  'createdAt',
  'snapshotBankName',
]);

export const disbursementItemQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(150, 'Search cannot exceed 150 characters')
      .optional(),

    // --- Filters ---
    batchId: uuidSchema.optional(),
    investmentId: uuidSchema.optional(),
    investorId: uuidSchema.optional(),
    exportFormat: exportFormatSchema.optional(),
    snapshotBankName: bankNameSchema,

    // Amount range (both ends inclusive and optional).
    minAmount: z.coerce
      .number()
      .nonnegative('minAmount cannot be negative')
      .optional(),
    maxAmount: z.coerce
      .number()
      .nonnegative('maxAmount cannot be negative')
      .optional(),

    // --- Pagination ---
    page: z.coerce
      .number()
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .default(1),
    limit: z.coerce
      .number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(10),

    // --- Sorting ---
    sortBy: disbursementItemSortBySchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })

export type DisbursementItemQuery = z.infer<typeof disbursementItemQuerySchema>;
