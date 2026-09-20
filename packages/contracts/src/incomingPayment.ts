import { z } from 'zod';
import { fileUrlSchema, moneySchema } from './common.js';

export const IncomingPaymentMethodEnum = z.enum([
  "bkash",
  "nagad",
  "rocket",
  "bank_transfer",
]);

export const IncomingPaymentStatusEnum = z.enum([
  "pending",
  "confirmed",
  "overdue",
]);

export const incomingPaymentCreateSchema = z.object({
  investmentId: z.string().uuid({ message: "Invalid ID format" }),
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
  dueDate: z.coerce.date().optional(),
})

export type IncomingPaymentCreateInput = z.infer<typeof incomingPaymentCreateSchema>;


// For admin
export const incomingPaymentConfirmSchema = z
  .object({
    id: z.string().uuid({ message: "Invalid ID format" }),
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
  page: z.coerce
    .number()
    .int("Page must be a whole number")
    .positive("Page must be greater than zero")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be a whole number")
    .positive("Limit must be greater than zero")
    .max(100, "Limit cannot exceed 100")
    .default(20),
  // --- Sorting ---
  sortBy: incomingPaymentSortByEnum.default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  //--- Filters ---
  investmentId: z.string().uuid({ message: "Invalid ID format" }).optional(),
  investorId: z.string().uuid({ message: "Invalid ID format" }).optional(), // via investment.investorId
  status: IncomingPaymentStatusEnum.optional(),
  paymentMethod: IncomingPaymentMethodEnum.optional(),

  // Amount range
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),

  // Due date range (installment due, not record creation — see note)
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),

  // Free-text search over sender account info
  search: z.string().trim().max(150).optional(),
})