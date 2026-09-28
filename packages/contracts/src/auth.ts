import { z } from 'zod';

// bcrypt only hashes the first 72 BYTES of a password — anything after that
// is silently ignored, so a longer password would give a false sense of
// strength. Counted in UTF-8 bytes, not characters (Bangla chars are 3 bytes).
const BCRYPT_MAX_BYTES = 72;

// Hand-rolled rather than TextEncoder: this package compiles with no
// DOM/Node lib types (tsconfig "types": []), so TextEncoder isn't declared.
const utf8ByteLength = (value: string) => {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

// One field for both: investors log in with phone, admins with email (see
// User.phone / User.email in the prisma schema). The API decides which
// column to match by whether it contains '@'.
export const loginInputSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email or phone is required')
    .max(150, 'Email or phone cannot exceed 150 characters'),
  // No strength rules on login — only on set/change. Max still enforced so a
  // multi-MB "password" can't be used to burn CPU in bcrypt.
  password: z
    .string()
    .min(1, 'Password is required')
    .max(256, 'Password is too long'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// ---------------------------------------------------------------------------
// Password policy (used when a password is set or changed)
// ---------------------------------------------------------------------------

export const newPasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .refine((value) => utf8ByteLength(value) <= BCRYPT_MAX_BYTES, {
    message: 'Password is too long (max 72 bytes)',
  })
  .refine((value) => /[a-z]/.test(value), {
    message: 'Password must contain a lowercase letter',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must contain an uppercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'Password must contain a number',
  });

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(256),
    newPassword: newPasswordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

// ---------------------------------------------------------------------------
// Forgot / reset password (reset also completes an admin invite)
// ---------------------------------------------------------------------------

export const forgotPasswordInputSchema = z.object({
  identifier: loginInputSchema.shape.identifier,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

// `token` is the value from the emailed link's #token= fragment.
export const resetPasswordInputSchema = z.object({
  token: z.string().trim().min(20, 'Invalid link').max(200, 'Invalid link'),
  newPassword: newPasswordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// ---------------------------------------------------------------------------
// Admin accounts (created by a SUPER_ADMIN)
// ---------------------------------------------------------------------------

// SUPER_ADMIN is deliberately not creatable through the API — the only way
// to mint one is the create-super-admin script on the server itself.
export const creatableAdminRoleSchema = z.enum(['ADMIN', 'MODERATOR']);

export const createAdminAccountInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(150, 'Email cannot exceed 150 characters'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters'),
  role: creatableAdminRoleSchema,
  department: z
    .string()
    .trim()
    .max(100, 'Department cannot exceed 100 characters')
    .optional(),
  // Comma-separated IPs / CIDR ranges, e.g. "203.0.113.7, 10.20.0.0/16".
  // Syntax is checked server-side; omit for no IP restriction.
  allowedIpRange: z
    .string()
    .trim()
    .max(100, 'IP allowlist cannot exceed 100 characters')
    .optional(),
});

export type CreateAdminAccountInput = z.infer<
  typeof createAdminAccountInputSchema
>;
