import { z } from 'zod';
import {
  limitValidationSchema,
  pageValidationSchema,
  searchValidationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common.js';

// ---------------------------------------------------------------------------
// Enum mirror (kept in sync with prisma schema — avoids a runtime dep on
// @prisma/client in the shared contracts package)
// ---------------------------------------------------------------------------
export const editRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

// Query (findAll for staff — filter, search, pagination, sorting)
// /api/admin/investor/edit-requests?status=PENDING&investorId=<uuid>&search=rahman&page=1&limit=10&sortBy=createdAt&sortOrder=desc
export const investorEditRequestQuerySchema = z.object({
  search: searchValidationSchema,
  status: editRequestStatusSchema.optional(),
  investorId: uuidSchema.optional(),
  page: pageValidationSchema,
  limit: limitValidationSchema,
  sortBy: z.enum(['createdAt', 'status']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

export type InvestorEditRequestQuery = z.infer<
  typeof investorEditRequestQuerySchema
>;
