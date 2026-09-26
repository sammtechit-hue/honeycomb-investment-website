import { z } from 'zod';
import {
  emailSchema,
  limitValidationSchema,
  pageValidationSchema,
  passwordSchema,
  phoneNumberSchema,
  searchValidationSchema,
  sortOrderSchema,
  ipAddressSchema
} from './common.js';

// ============================================================================
// Admin — shared zod contracts
// Source of truth: Prisma `User` (role ADMIN / MODERATOR / SUPER_ADMIN) plus
// its 1:1 `AdminProfile` (schema.prisma §2). Prisma has no single `Admin`
// model: the credentials live on `User`, the profile on `AdminProfile`.
// ============================================================================

// Mirrors Prisma `Role` enum.
export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'INVESTOR',
]);

// Mirrors the roles that may own an `AdminProfile`. INVESTOR is excluded so an
// investor account can never be minted through the admin back office.
export const adminRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']);

// `AdminProfile.name` — VarChar(150), nullable in Prisma but expected on the
// accounts this endpoint creates.
export const adminNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(150, 'Name cannot exceed 150 characters');

// `AdminProfile.department` — VarChar(100).
export const adminDepartmentSchema = z
  .string()
  .trim()
  .min(2, 'Department must be at least 2 characters')
  .max(100, 'Department cannot exceed 100 characters')
  .optional();


// Base Admin Schema
const adminBaseSchema = z.object({
  name: adminNameSchema,
  email: emailSchema,
  // Admins sign in by email, so the phone stays optional (User.phone is
  // nullable and is the investor login identifier).
  phone: phoneNumberSchema.optional(),
  role: adminRoleSchema.default('ADMIN'),
  department: adminDepartmentSchema.optional(),
  allowedIpRange: ipAddressSchema.optional(),
});

// ============================================================================
// Admin Create Schema
// For POST /admin
// ============================================================================

export const adminCreateInputSchema = adminBaseSchema.extend({
  // Hashed into `User.passwordHash` by the service — never stored, logged or
  // returned in plaintext.
  password: passwordSchema,
});

export type AdminCreateInput = z.infer<typeof adminCreateInputSchema>;

// ============================================================================
// Admin Update Schema
// For PATCH /admin/:id
// ============================================================================
// All fields optional. `password` is excluded on purpose — credential changes
// belong in a dedicated, re-authenticated flow rather than a generic PATCH.
// ============================================================================

export const adminUpdateInputSchema = adminCreateInputSchema.partial();

export type AdminUpdateInput = z.infer<typeof adminUpdateInputSchema>;

// ============================================================================
// Admin Query Schema
// For GET /admin
// ============================================================================

export const adminSortBySchema = z.enum([
  'name',
  'email',
  'role',
  'department',
  'createdAt',
]);

export const adminQuerySchema = z.object({
  // Free-text search over name, email and department.
  search: searchValidationSchema,

  // --- Filters ---
  role: roleSchema.optional(),
  department: adminDepartmentSchema.optional(),

  // --- Pagination ---
  page: pageValidationSchema,
  limit: limitValidationSchema,

  // --- Sorting ---
  // The profile has no timestamps of its own; `createdAt` comes from the
  // relation to `User`, which is what accounts are listed by.
  sortBy: adminSortBySchema.default('createdAt'),
  sortOrder: sortOrderSchema,
});

export type AdminQuery = z.infer<typeof adminQuerySchema>;
