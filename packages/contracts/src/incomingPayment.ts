import { z } from 'zod';

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

// URL validator for uploaded file references (S3/CDN links)
const fileUrlSchema = z
  .string()
  .trim()
  .url('File URL must be a valid URL')
  .max(500, 'File URL cannot exceed 500 characters');


const moneySchema = z
  .coerce
  .number()
  .positive('Amount must be greater than zero')
  .max(999_999_999_999.99, 'Amount exceeds maximum allowed value')
  // Round to 2 decimal places to match Decimal(14,2)
  // Step	Calculation	Result
  // 1. Multiply by 100	3.14159 * 100	314.159
  // 2. Math.round()	Math.round(314.159)	314
  // 3. Divide by 100	314 / 100	3.14 ✅
  .transform((val) => Math.round(val * 100) / 100);

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