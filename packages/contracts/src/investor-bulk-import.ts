import { z } from 'zod';
import {
  accountNameSchema,
  accountNumberSchema,
  addressSchema,
  bankAccountTypeSchema,
  bankNameSchema,
  bankSelectedSchema,
  branchNameSchema,
  emailSchema,
  fileUrlSchema,
  fullNameSchema,
  passwordSchema,
  phoneNumberSchema,
  professionSchema,
  routingNumberSchema,
  uuidSchema,
  workplaceSchema,
} from './common.js';
import {
  investorCategorySchema,
  nidNumberSchema,
  nomineeSchema,
} from './investor.js';


const emptyToUndefined = (value: unknown) =>
  value === '' ? undefined : value;

// ============================================================================
// Bulk Import Limits
// ============================================================================
const DEFAULT_BULK_IMPORT_MAX_ROWS = 100;
const BULK_IMPORT_MAX_ROWS_ENV_KEY = 'INVESTOR_BULK_IMPORT_MAX_ROWS';

const readEnvVar = (key: string): string | undefined => {
  const env = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  return env?.[key];
};

const resolveBulkImportMaxRows = (): number => {
  const raw = readEnvVar(BULK_IMPORT_MAX_ROWS_ENV_KEY)?.trim();
  if (!raw) return DEFAULT_BULK_IMPORT_MAX_ROWS;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_BULK_IMPORT_MAX_ROWS;
};

export const BULK_IMPORT_MAX_ROWS = resolveBulkImportMaxRows();

// ============================================================================
// Bulk Import Row
// ============================================================================

export const bulkInvestorRowSchema = z
  .object({
    // Row number as seen in the spreadsheet; the header is row 1.
    rowNumber: z
      .number()
      .int('Row number must be a whole number')
      .positive('Row number must be a positive integer'),

    // --- User contact (required) ---
    fullname: fullNameSchema,
    // Same lowercasing as signupInputSchema in auth.ts.
    email: emailSchema.toLowerCase(),
    phone: phoneNumberSchema,
    password: passwordSchema.optional(),
    // --- Investor profile (optional) ---
    // কারণ CSV-তে optional field খালি থাকলে সেটি অনেক সময় undefined না হয়ে empty string ('') হিসেবে আসে।
    nidNumber: nidNumberSchema,

    address: z.preprocess(emptyToUndefined, addressSchema.optional()),
    profession: z.preprocess(emptyToUndefined, professionSchema.optional()),
    workplace: z.preprocess(emptyToUndefined, workplaceSchema.optional()),
    category: z.preprocess(
      emptyToUndefined,
      investorCategorySchema.default('bronze'),
    ),

    // --- Bank account group (optional, all-or-required) ---
    selectedBank: z.preprocess(emptyToUndefined, bankSelectedSchema.optional()),
    bankName: z.preprocess(emptyToUndefined, bankNameSchema.optional()),
    accountName: z.preprocess(emptyToUndefined, accountNameSchema.optional()),
    accountNumber: z.preprocess(
      emptyToUndefined,
      accountNumberSchema.optional(),
    ),
    routingNumber: z.preprocess(emptyToUndefined, routingNumberSchema.optional()),
    accountType: z.preprocess(
      emptyToUndefined,
      bankAccountTypeSchema.optional(),
    ),
    branchName: z.preprocess(emptyToUndefined, branchNameSchema.optional()),

    // --- Nominee group (optional, all-or-required) ---
    nomineeName: z.preprocess(
      emptyToUndefined,
      nomineeSchema.shape.nomineeName.optional(),
    ),
    nomineePhone: z.preprocess(
      emptyToUndefined,
      nomineeSchema.shape.nomineePhone.optional(),
    ),
    relation: z.preprocess(emptyToUndefined, nomineeSchema.shape.relation.optional()),
    nomineeNidNumber: z.preprocess(
      emptyToUndefined,
      nidNumberSchema.optional(),
    ),

    // --- KYC documents (required) ---
    nidFront: fileUrlSchema,
    nidBack: fileUrlSchema,
    photo: fileUrlSchema,
  })
  //  এর কাজ হলো CSV-তে এমন কোনো column থাকলে যেটি তোমার Zod schema-তে define করা নেই, সেটি reject করা।
  .strict()
  .superRefine((row, ctx) => {
    const hasBankField = [
      row.selectedBank,
      row.bankName,
      row.accountName,
      row.accountNumber,
      row.routingNumber,
      row.accountType,
      row.branchName,
    ].some((value) => value !== undefined);

    if (hasBankField) {
      // The bank account row cannot be created without this enum, so it belongs
      // to the required group as well.
      if (row.selectedBank === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['selectedBank'],
          message: 'Bank selection is required when any bank detail is provided',
        });
      }
      if (row.bankName === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bankName'],
          message: 'Bank name is required when any bank detail is provided',
        });
      }
      if (row.accountName === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accountName'],
          message: 'Account name is required when any bank detail is provided',
        });
      }
      if (row.accountNumber === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accountNumber'],
          message: 'Account number is required when any bank detail is provided',
        });
      }
    }

    const hasNomineeField = [
      row.nomineeName,
      row.nomineePhone,
      row.relation,
      row.nomineeNidNumber,
    ].some((value) => value !== undefined);

    if (hasNomineeField) {
      if (row.nomineeName === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nomineeName'],
          message: 'Nominee name is required when any nominee detail is provided',
        });
      }
      if (row.nomineePhone === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nomineePhone'],
          message: 'Nominee phone is required when any nominee detail is provided',
        });
      }
      if (row.relation === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relation'],
          message: 'Relation is required when any nominee detail is provided',
        });
      }
    }
  });

export type BulkInvestorRowInput = z.infer<typeof bulkInvestorRowSchema>;

// ============================================================================
// Bulk Import Request
// ============================================================================
// export const bulkInvestorImportModeSchema = z.enum(
//   ['valid_only', 'all_or_nothing'],
//   { message: 'Mode must be one of: valid_only, all_or_nothing' },
// );

// export type BulkInvestorImportMode = z.infer<
//   typeof bulkInvestorImportModeSchema
// >;

export const bulkInvestorImportRequestSchema = z
  .object({
    rows: z
      .array(bulkInvestorRowSchema)
      .min(1, 'At least one row is required')
      .max(
        BULK_IMPORT_MAX_ROWS,
        `A single import cannot exceed ${BULK_IMPORT_MAX_ROWS} rows`,
      ),

    // mode: bulkInvestorImportModeSchema.default('valid_only'),

    // Validate and report without writing anything.
    // dryRun: z.boolean().default(false),
  })

  // To check that email, phone, and NID are unique within the same file.
  .superRefine((request, ctx) => {

    // Return if request dont send array
    if (!Array.isArray(request.rows)) return;

    // প্রতিটি Map-এর কাজ হলো আগে কোন row-তে এই value পাওয়া গিয়েছিল, সেটা মনে রাখা।
    const firstByEmail = new Map<string, number>();
    const firstByPhone = new Map<string, number>();
    const firstByNid = new Map<string, number>();
    // Row numbers identify rows in the response, so they must be unique
    // inside one file.
    const firstIndexByRowNumber = new Map<number, number>();

    request.rows.forEach((row, index) => {

      // check() function
      const check = (
        map: Map<string | number, number>,
        value: number | string | undefined,
        field: 'email' | 'phone' | 'nidNumber' | 'rowNumber',
        label: string,
      ) => {
        if (value === undefined) return;

        // for watching in which row data was, at first
        const firstRowNumber = map.get(value);

        // firstRowNumber not null 
        if (firstRowNumber !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rows', index, field],
            message: `Row ${row.rowNumber}: duplicate ${label} "${value}" (already used in row ${firstRowNumber})`,
          });
        } else {
          map.set(value, row.rowNumber);
        }
      };

      // Function Call
      check(firstByEmail, row.email, 'email', 'email');
      check(firstByPhone, row.phone, 'phone', 'phone');
      check(firstByNid, row.nidNumber, 'nidNumber', 'NID number');
      check(firstIndexByRowNumber, row.rowNumber, 'rowNumber', 'Row number')
    });
  });

export type BulkInvestorImportRequest = z.infer<
  typeof bulkInvestorImportRequestSchema
>;

// ============================================================================
// Bulk Import Response
// ============================================================================

// `created` = written; `valid` = dry run, row would be created;
// `skipped` = valid row, not imported because another row failed;
// `failed` = the row was rejected.
export const bulkInvestorRowStatusSchema = z.enum([
  'created',
  // 'valid',
  'skipped',
  'failed',
]);

export type BulkInvestorRowStatus = z.infer<typeof bulkInvestorRowStatusSchema>;

export const bulkInvestorRowIssueSchema = z.object({
  // Absent for row-level problems that don't belong to one column.
  field: z.string().optional(),
  message: z.string(),
});

export type BulkInvestorRowIssue = z.infer<typeof bulkInvestorRowIssueSchema>;

export const bulkInvestorRowResultSchema = z.object({
  rowNumber: z
    .number()
    .int('Row number must be a whole number')
    .positive('Row number must be a positive integer'),
  status: bulkInvestorRowStatusSchema,
  // Present once the investor row exists (created, or matched in a dry run).
  investorId: uuidSchema.optional(),
  errors: z.array(bulkInvestorRowIssueSchema),
  // warnings: z.array(bulkInvestorRowIssueSchema),
  // inviteStatus: bulkInvestorInviteStatusSchema.optional(),
});

export type BulkInvestorRowResult = z.infer<typeof bulkInvestorRowResultSchema>;

export const bulkInvestorImportResponseSchema = z.object({
  // dryRun: z.boolean(),
  totals: z.object({
    total: z.number().int().nonnegative(),
    created: z.number().int().nonnegative(),
    // valid: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  results: z.array(bulkInvestorRowResultSchema),
});

export type BulkInvestorImportResponse = z.infer<
  typeof bulkInvestorImportResponseSchema
>;
