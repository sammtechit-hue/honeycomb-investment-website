import { z } from 'zod';
import {
  accountNameSchema,
  accountNumberSchema,
  bankAccountTypeSchema,
  bankExportFormatSchema,
  bankNameSchema,
  branchNameSchema,
  limitValidationSchema,
  moneySchema,
  nonNegativeNumberSchema,
  pageValidationSchema,
  routingNumberSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

// Mirrors Prisma `ExportFormat` — file format of this single line item.
export const exportFormatSchema = bankExportFormatSchema;


export const disbursementItemBaseSchema = z.object({
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

// Admin-only partial edit: the free-form notes can change after creation and the
// item can be attached to a disbursement batch. `null` (or an empty string for a
// note) clears it; omitting `batchId` leaves the current batch unchanged, while
// `null` detaches the item.
export const disbursementItemRemarkUpdateInputSchema = z.object({
  remarks: z
    .string()
    .trim()
    .max(255, 'Remarks cannot exceed 255 characters')
    .nullable(),
  investorNote: z
    .string()
    .trim()
    .max(255, 'investorNote cannot exceed 255 characters')
    .nullable(),
  batchId: uuidSchema.nullable().optional(),
});

export type DisbursementItemRemarkUpdateInput = z.infer<
  typeof disbursementItemRemarkUpdateInputSchema
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
    search: searchValidationSchema,

    // --- Filters ---
    batchId: uuidSchema.optional(),
    investmentId: uuidSchema.optional(),
    investorId: uuidSchema.optional(),
    exportFormat: exportFormatSchema.optional(),
    snapshotBankName: bankNameSchema.optional(),

    // Amount range (both ends inclusive and optional).
    minAmount: nonNegativeNumberSchema.optional(),
    maxAmount: nonNegativeNumberSchema.optional(),

    // --- Pagination ---
    page: pageValidationSchema,
    limit: limitValidationSchema,

    // --- Sorting ---
    sortBy: disbursementItemSortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema,
  })

export type DisbursementItemQuery = z.infer<typeof disbursementItemQuerySchema>;


// Isdisbursed true for items and update batch
//-----------------------------------------------------------------
export const addItemsToBatchInpu = z.object({
  batchId: uuidSchema,
  itemIds: z
    .array(z.string().uuid('Each item ID must be a valid UUID'))
    .min(1, 'At least one item must be provided'),
})
  .superRefine((data, ctx) => {
    const uniqueItemIds = new Set(data.itemIds);

    if (uniqueItemIds.size !== data.itemIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['itemIds'],
        message: 'Duplicate item IDs are not allowed',
      });
    }
  })


export type AddItemsToBatchInpu = z.infer<typeof addItemsToBatchInpu>;