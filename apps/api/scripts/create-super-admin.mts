// Creates the first SUPER_ADMIN account. The API has no public sign-up for
// admins, so this is the bootstrap path; every later admin should be created
// by a super admin from inside the app.
//
//   pnpm --filter api create-super-admin -- --email you@company.com --name "Your Name"
//
// The password is prompted for (hidden) so it never lands in shell history.
// Refuses to run if a SUPER_ADMIN already exists.
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { newPasswordSchema } from '@investment-platform/contracts/auth';
import { PrismaClient, Role } from '@investment-platform/db';

// Mirrors BCRYPT_ROUNDS in src/auth/auth.constants.ts (not imported: that
// file is CommonJS-compiled app code). If they ever drift, login upgrades
// any lower-cost hash automatically (PasswordService.needsRehash).
const BCRYPT_ROUNDS = 12;

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
  },
});

const email = z.string().trim().toLowerCase().email().safeParse(values.email);
if (!email.success) {
  fail('Pass a valid --email.');
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
// Mute echo so the typed password isn't shown on screen.
const muted = rl as unknown as { _writeToOutput: (s: string) => void };
muted._writeToOutput = () => {};
const lines = rl[Symbol.asyncIterator]();
const password = await promptHidden('Password: ');
const confirm = await promptHidden('Confirm password: ');
rl.close();
if (password !== confirm) {
  fail('Passwords do not match.');
}
const policy = newPasswordSchema.safeParse(password);
if (!policy.success) {
  fail(policy.error.issues.map((issue) => issue.message).join('\n'));
}

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
  if (existing > 0) {
    fail('A SUPER_ADMIN already exists. Create further admins from the app.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: email.data,
      passwordHash,
      role: Role.SUPER_ADMIN,
      adminProfile: { create: { name: values.name?.trim() || null } },
    },
    select: { id: true, email: true },
  });
  console.log(`Created SUPER_ADMIN ${user.email} (${user.id})`);
} finally {
  await prisma.$disconnect();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// Reads one line from the shared (muted) readline. Its async iterator
// buffers lines, so input that arrives before the prompt (piped stdin)
// isn't lost.
async function promptHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const { value } = await lines.next();
  process.stdout.write('\n');
  return typeof value === 'string' ? value : '';
}
