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

// Review body (staff) — PATCH /api/admin/investor/edit-requests/:id
// Mirrors the review columns on the InvestorEditRequest model:
// PENDING is not a review outcome, and reviewedBy / reviewedAt are taken
// from the admin session server-side, so only the decision and (when
// rejecting) a reason travel in the body.
export const investorEditRequestReviewSchema = z
  .object({
    status: editRequestStatusSchema.exclude(['PENDING']),
    rejectionReason: z
      .string()
      .trim()
      .min(5, 'Rejection reason is required (min 5 characters)')
      .max(150, 'Rejection reason cannot exceed 150 characters')
      .optional(),
  })
  .refine(
    (data) => data.status !== 'REJECTED' || !!data.rejectionReason,
    {
      message: 'rejectionReason is required when rejecting an edit request',
      path: ['rejectionReason'],
    },
  );

export type InvestorEditRequestReview = z.infer<
  typeof investorEditRequestReviewSchema
>;
