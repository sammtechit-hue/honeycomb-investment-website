import { z } from 'zod';
import {
  dateSchema,
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
  installmentNumber: z
    .number()
    .int("Installment number must be a whole number")
    .positive("Installment number must be positive")
    .optional(),
  dueDate: dateSchema.optional(),
})

export type IncomingPaymentCreateInput = z.infer<typeof incomingPaymentCreateSchema>;


// For admin
export const incomingPaymentConfirmSchema = z
  .object({
    id: uuidSchema,
    status: IncomingPaymentStatusEnum,
  })

export type IncomingPaymentConfirmInput = z.infer<
  typeof incomingPaymentConfirmSchema
>;


// For admin
export const incomingPaymentUpdateSchema = incomingPaymentCreateSchema
  .partial()

export type IncomingPaymentUpdateInput = z.infer<
  typeof incomingPaymentUpdateSchema
>;


// For query
export const incomingPaymentSortByEnum = z.enum([
  "amount",
  "amount",
  "dueDate",
  "confirmedAt",
  "installmentNumber",
  "status",
])

export const incomingPaymentQuerySchema = z.object({
  // --- Pagination ---
  page: pageValidationSchema,
  limit: limitValidationSchema,
  // --- Sorting ---
  sortBy: incomingPaymentSortByEnum.default("dueDate"),
  sortOrder: sortOrderSchema,

  //--- Filters ---
  investmentId: uuidSchema.optional(),
  investorId: uuidSchema.optional(), // via investment.investorId
  status: IncomingPaymentStatusEnum.optional(),
  paymentMethod: IncomingPaymentMethodEnum.optional(),

  // Amount range
  minAmount: nonNegativeNumberSchema.optional(),
  maxAmount: nonNegativeNumberSchema.optional(),

  // Due date range (installment due, not record creation — see note)
  dueDateFrom: dateSchema.optional(),
  dueDateTo: dateSchema.optional(),

  // Free-text search over sender account info
  search: searchValidationSchema,
})