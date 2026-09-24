import { z } from 'zod';
import {
  bankAccountFieldsSchema,
  bankAccountRoutingRule,
  bankAccountTypeSchema,
  bankSelectedSchema,
  limitValidationSchema,
  pageValidationSchema,
  queryBooleanSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

// ============================================================================
// Investor Bank Account — shared zod contracts
// Source of truth: Prisma model `InvestorBankAccount` (schema.prisma §4)
// An investor may hold several accounts (`investorId` is deliberately NOT
// unique — bankAccount is a list on Investor). Disbursements snapshot the
// active one, so exactly one row per investor should carry isActive.
// ============================================================================

// ============================================================================
// Base Investor Bank Account Schema
// ============================================================================
// Reuses `bankAccountFieldsSchema` from common.ts (the same field rules used
// for the account collected during investor registration) and adds the owning
// investor plus the active flag.
// ============================================================================

const investorBankAccountBaseSchema = bankAccountFieldsSchema.extend({
  // The investor this account belongs to (an investor may have many).
  investorId: uuidSchema,
  // Which account disbursements snapshot from. Prisma defaults it to false;
  // activating one row means the service deactivates its siblings.
  isActive: z.boolean().default(false),
});

// ============================================================================
// Investor Bank Account Create Schema
// For POST /investor-bank-account
// ============================================================================

export const investorBankAccountCreateInputSchema =
  // Cross-field rule: a non-City-Bank account needs its routing number for
  // BEFTN — the same rule the registration flow applies.
  investorBankAccountBaseSchema.refine(bankAccountRoutingRule, {
    message: 'Routing number is required for banks other than City Bank',
    path: ['routingNumber'],
  });

export type InvestorBankAccountCreateInput = z.infer<
  typeof investorBankAccountCreateInputSchema
>;

// ============================================================================
// Investor Bank Account Update Schema
// For PATCH /investor-bank-account/:id
// ============================================================================
// All fields optional. `investorId` is intentionally excluded — re-pointing an
// account at another investor would redirect their payouts, which is an
// admin-level operation for an explicit, audited flow rather than a PATCH.
//
// The routing rule stays safe here: it only fires when the request itself sets
// `selectedBank` to a non-City-Bank account without a routing number, so a
// partial body that leaves the bank selection alone is never rejected.
// ============================================================================

export const investorBankAccountUpdateInputSchema = investorBankAccountBaseSchema
  .omit({ investorId: true })
  .partial()
  .refine(bankAccountRoutingRule, {
    message: 'Routing number is required when switching to a bank other than City Bank',
    path: ['routingNumber'],
  });

export type InvestorBankAccountUpdateInput = z.infer<
  typeof investorBankAccountUpdateInputSchema
>;

// ============================================================================
// Investor Bank Account Query Schema
// For GET /investor-bank-account
// ============================================================================

export const investorBankAccountSortBySchema = z.enum([
  'bankName',
  'accountName',
  'accountNumber',
  'selectedBank',
  'isActive',
]);

export const investorBankAccountQuerySchema = z.object({
  // Free-text search over the bank, account name and account number.
  search: searchValidationSchema,

  // --- Filters ---
  investorId: uuidSchema.optional(),
  selectedBank: bankSelectedSchema.optional(),
  accountType: bankAccountTypeSchema.optional(),
  // Query strings arrive as text, so this is the coerced "true"/"false" form.
  isActive: queryBooleanSchema.optional(),

  // --- Pagination ---
  page: pageValidationSchema,
  limit: limitValidationSchema,

  // --- Sorting ---
  // The model has no timestamps at all (no createdAt/updatedAt), so sorting
  // stays on stored columns only.
  sortBy: investorBankAccountSortBySchema.default('bankName'),
  sortOrder: sortOrderSchema,
});

export type InvestorBankAccountQuery = z.infer<
  typeof investorBankAccountQuerySchema
>;
