import { z } from 'zod';
import { dateSchema, uuidSchema } from './common.js';
import {
  investmentCreateFieldsSchema,
  investmentPeriodDisbursementError,
  investmentStatusSchema,
} from './investment.js';

const emptyToUndefined = (value: unknown) =>
  value === '' ? undefined : value;

// ============================================================================
// Bulk Create Limits
// ============================================================================
const DEFAULT_BULK_INVESTMENT_MAX_ROWS = 100;
const BULK_INVESTMENT_MAX_ROWS_ENV_KEY = 'INVESTMENT_BULK_CREATE_MAX_ROWS';

const readEnvVar = (key: string): string | undefined => {
  const env = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  return env?.[key];
};

const resolveBulkInvestmentMaxRows = (): number => {
  const raw = readEnvVar(BULK_INVESTMENT_MAX_ROWS_ENV_KEY)?.trim();
  if (!raw) return DEFAULT_BULK_INVESTMENT_MAX_ROWS;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_BULK_INVESTMENT_MAX_ROWS;
};

export const BULK_INVESTMENT_MAX_ROWS = resolveBulkInvestmentMaxRows();

// ============================================================================
// Bulk Create Row
// ============================================================================
export const bulkInvestmentRowSchema = investmentCreateFieldsSchema
  .extend({
    // Row number as seen in the spreadsheet; the header is row 1.
    rowNumber: z
      .number()
      .int('Row number must be a whole number')
      .positive('Row number must be a positive integer'),

    // --- References (required) ---
    investorId: uuidSchema,
    projectId: uuidSchema,

    // --- Dates ---
    investmentDate: dateSchema,
    agreementEndDate: z.preprocess(emptyToUndefined, dateSchema.optional()),

    // --- Agreement / deed details (optional) ---
    agreementPlace: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(150).optional(),
    ),
    deedOffical: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    deedGoverment: z.preprocess(emptyToUndefined, z.string().trim().optional()),

    // --- Physical items tracking (optional) ---
    chequeGiven: z.preprocess(emptyToUndefined, z.boolean().optional()),
    cashVoucharGiven: z.preprocess(emptyToUndefined, z.boolean().optional()),

    souvenirGiven: z.preprocess(emptyToUndefined, z.boolean().optional()),
    isSouvenirApplicable: z.preprocess(
      emptyToUndefined,
      z.boolean().optional(),
    ),

    certificateGiven: z.preprocess(emptyToUndefined, z.boolean().optional()),
    isCertificateApplicable: z.preprocess(
      emptyToUndefined,
      z.boolean().optional(),
    ),

    // --- Notes ---
    specialInstruction: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(1000, 'Special instruction cannot exceed 1000 characters')
        .optional(),
    ),

    // Same as the single admin-create contract: the row carries its status.
    status: investmentStatusSchema.default('active'),
  })
  // Reject spreadsheet columns that are not defined above.
  .strict()
  .superRefine((row, ctx) => {
    const message = investmentPeriodDisbursementError({
      investmentPeriodMonths: row.investmentPeriodMonths,
      disbursementPeriod: row.disbursementPeriod,
    });
    if (message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['investmentPeriodMonths'],
        message,
      });
    }
  });

export type BulkInvestmentRowInput = z.infer<typeof bulkInvestmentRowSchema>;

// ============================================================================
// Bulk Create Request
// ============================================================================
// All or nothing: every row must be valid, and the API writes the batch in a
// single transaction. One bad row rejects the whole request.
export const bulkInvestmentCreateRequestSchema = z
  .object({
    rows: z
      .array(bulkInvestmentRowSchema)
      .min(1, 'At least one row is required')
      .max(
        BULK_INVESTMENT_MAX_ROWS,
        `A single bulk create cannot exceed ${BULK_INVESTMENT_MAX_ROWS} rows`,
      ),
  })
  .superRefine((request, ctx) => {
    if (!Array.isArray(request.rows)) return;

    // Row numbers identify rows in the response, so they must be unique
    // inside one file.
    const firstIndexByRowNumber = new Map<number, number>();

    request.rows.forEach((row, index) => {
      const firstIndex = firstIndexByRowNumber.get(row.rowNumber);
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rows', index, 'rowNumber'],
          message: `Row ${row.rowNumber}: duplicate row number (already used at position ${firstIndex + 1})`,
        });
      } else {
        firstIndexByRowNumber.set(row.rowNumber, index);
      }
    });
  });

export type BulkInvestmentCreateRequest = z.infer<
  typeof bulkInvestmentCreateRequestSchema
>;

// ============================================================================
// Bulk Create Response
// ============================================================================
export const bulkInvestmentRowStatusSchema = z.enum(['created', 'failed']);

export type BulkInvestmentRowStatus = z.infer<
  typeof bulkInvestmentRowStatusSchema
>;

export const bulkInvestmentRowIssueSchema = z.object({
  // Absent for row-level problems that don't belong to one column.
  field: z.string().optional(),
  message: z.string(),
});

export type BulkInvestmentRowIssue = z.infer<
  typeof bulkInvestmentRowIssueSchema
>;

export const bulkInvestmentRowResultSchema = z.object({
  rowNumber: z
    .number()
    .int('Row number must be a whole number')
    .positive('Row number must be a positive integer'),
  status: bulkInvestmentRowStatusSchema,
  // Present only once the row has been created.
  investmentId: uuidSchema.optional(),
  errors: z.array(bulkInvestmentRowIssueSchema),
});

export type BulkInvestmentRowResult = z.infer<
  typeof bulkInvestmentRowResultSchema
>;

export const bulkInvestmentCreateResponseSchema = z.object({
  totals: z.object({
    total: z.number().int().nonnegative(),
    created: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  results: z.array(bulkInvestmentRowResultSchema),
});

export type BulkInvestmentCreateResponse = z.infer<
  typeof bulkInvestmentCreateResponseSchema
>;
