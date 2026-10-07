/**
 * seed.ts — idempotent SUPER_ADMIN seed (portable across machines).
 *
 * The API has no public sign-up for admins, so this is the bootstrap path;
 * every later admin should be created by a super admin from inside the app.
 * Re-running is safe: if a SUPER_ADMIN already exists the seed exits
 * without changing anything.
 *
 * Usage on any machine (requires DATABASE_URL in .env or environment):
 *
 *   cd packages/db
 *   SUPERADMIN_EMAIL=superadmin@example.com SUPERADMIN_PASSWORD='Demo@1234' \
 *     node --env-file=.env prisma/seed.ts
 *
 * Or via prisma (needs the `prisma.seed` key in package.json):
 *
 *   pnpm --filter @investment-platform/db exec prisma db seed
 *
 * SUPERADMIN_NAME is optional.
 *
 * Requires Node >= 22.6 (native --env-file + type-stripping for .ts).
 * DATABASE_URL is read from the environment (.env).
 */
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Mirrors BCRYPT_ROUNDS in apps/api/src/auth/auth.constants.ts. If they ever
// drift, login upgrades any lower-cost hash automatically
// (PasswordService.needsRehash).
const BCRYPT_ROUNDS = 12;

function fail(message: string): never {
  console.error(`seed: ${message}`);
  process.exit(1);
}

// Mirrors newPasswordSchema in packages/contracts/src/auth.ts (kept inline so
// this script only needs bcrypt besides Prisma): min 8 chars, ASCII-only,
// max 72 UTF-8 bytes (bcrypt silently ignores anything past that), and at
// least one lowercase letter, one uppercase letter, and one digit.
function assertPasswordPolicy(password: string): void {
  const problems: string[] = [];
  if (password.length < 8) {
    problems.push('Password must be at least 8 characters');
  }
  // eslint-disable-next-line no-control-regex
  if (!/^[\x00-\x7F]+$/.test(password)) {
    problems.push('Password must contain only English characters');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    problems.push('Password is too long');
  }
  if (!/[a-z]/.test(password)) {
    problems.push('Password must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    problems.push('Password must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    problems.push('Password must contain a number');
  }
  if (problems.length > 0) {
    fail(problems.join('\n'));
  }
}

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? '';
  const name = (process.env.SUPERADMIN_NAME ?? '').trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    fail(
      'Set a valid SUPERADMIN_EMAIL (max 150 characters) in the environment.',
    );
  }
  if (!password) {
    fail('Set SUPERADMIN_PASSWORD in the environment.');
  }
  assertPasswordPolicy(password);

  const existing = await prisma.user.count({
    where: { role: Role.SUPER_ADMIN },
  });
  if (existing > 0) {
    console.log('seed: a SUPER_ADMIN already exists — nothing to do.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      adminProfile: { create: { name } },
    },
    select: { id: true, email: true },
  });
  console.log(`seed: created SUPER_ADMIN ${user.email} (${user.id})`);
}

try {
  await main();
} catch (err) {
  console.error('seed: FAILED', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
