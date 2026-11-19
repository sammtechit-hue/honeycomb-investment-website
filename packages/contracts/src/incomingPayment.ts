import { z } from 'zod';
import {
  fileUrlSchema,
  incomingPaymentMethodSchema,
  incomingPaymentStatusSchema,
  limitValidationSchema,
  moneySchema,
  nonNegativeNumberSchema,
  pageValidationSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

export const IncomingPaymentMethodEnum = incomingPaymentMethodSchema;

export const IncomingPaymentStatusEnum = incomingPaymentStatusSchema;

export const incomingPaymentCreateSchema = z.object({
  investmentId: uuidSchema,
  amount: moneySchema,
  paymentMethod: IncomingPaymentMethodEnum,
  screenshotUrl: fileUrlSchema,
  senderAccountInfo: z
    .string()
    .trim()
    .max(150, "Sender account info must be under 150 characters")
    .optional(),
})

export type IncomingPaymentCreateInput = z.infer<typeof incomingPaymentCreateSchema>;

export const incomingPaymentUpdateSchema = incomingPaymentCreateSchema
  .omit({ investmentId: true })
  .partial()
  .extend({
      status: IncomingPaymentStatusEnum.optional(),
    });


export type IncomingPaymentUpdateInput = z.infer<
  typeof incomingPaymentUpdateSchema
>;


// For query
export const incomingPaymentSortByEnum = z.enum([
  "amount",
  "createdAt",
  "confirmedAt",
  "status",
])

export const incomingPaymentQuerySchema = z.object({
  // --- Pagination ---
  page: pageValidationSchema,
  limit: limitValidationSchema,
  // --- Sorting ---
  sortBy: incomingPaymentSortByEnum.default("createdAt"),
  sortOrder: sortOrderSchema,

  //--- Filters ---
  investmentId: uuidSchema.optional(),
  investorId: uuidSchema.optional(), // via investment.investorId
  status: IncomingPaymentStatusEnum.optional(),
  paymentMethod: IncomingPaymentMethodEnum.optional(),

  // Amount range
  minAmount: nonNegativeNumberSchema.optional(),
  maxAmount: nonNegativeNumberSchema.optional(),

  // Free-text search over sender account info
  search: searchValidationSchema,
})