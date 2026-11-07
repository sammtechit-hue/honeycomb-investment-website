// Creates the demo logins listed in packages/contracts/src/demo-accounts.ts
// (two shareholders + one of each staff role, all with DEMO_PASSWORD) in a
// LOCAL development database.
//
//   docker compose up -d db                                   # repo root
//   pnpm --filter @investment-platform/db exec prisma migrate deploy
//   pnpm --filter api seed:demo
//
// Their password is public, so this refuses to run unless DATABASE_URL points
// at localhost and NODE_ENV isn't production. (The API also refuses to log
// demo accounts in when NODE_ENV=production.)
//
// Safe to re-run: each account's password, role and active flag are reset,
// its sessions are ended and its login lockout is cleared. Profiles you've
// changed are otherwise left alone — e.g. once the "new" shareholder has
// submitted verification it stays submitted. To start completely fresh:
//   docker compose down -v && docker compose up -d db, then migrate + seed.
import bcrypt from 'bcrypt';
import { newPasswordSchema } from '@investment-platform/contracts/auth';
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  type DemoAccount,
} from '@investment-platform/contracts/demo-accounts';
import { InvestorStatus, Prisma, PrismaClient, Role } from '@investment-platform/db';

// Mirrors BCRYPT_ROUNDS in src/auth/auth.constants.ts (see create-super-admin.mts).
const BCRYPT_ROUNDS = 12;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

if (process.env.NODE_ENV === 'production') {
  fail('NODE_ENV is production. Demo accounts are for local development only.');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail('DATABASE_URL is not set (expected in packages/db/.env).');
}
const host = hostOf(databaseUrl);
if (!host || !LOCAL_HOSTS.has(host)) {
  fail(
    `DATABASE_URL points at "${host ?? 'an unparseable URL'}", not localhost.\n` +
      'Demo accounts have a public password and must never exist on a shared or\n' +
      'deployed database. Point packages/db/.env at the local Docker database\n' +
      '(see packages/db/.env.example) and try again.',
  );
}

if (!newPasswordSchema.safeParse(DEMO_PASSWORD).success) {
  fail('DEMO_PASSWORD does not meet the password policy.');
}

// The URL checked above is the one used — Prisma isn't left to find its own.
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
try {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  for (const account of DEMO_ACCOUNTS) {
    await seedAccount(account, passwordHash);
  }

  console.log(`\nDemo accounts ready on ${host} — password for all: ${DEMO_PASSWORD}\n`);
  console.table(
    DEMO_ACCOUNTS.map((account) => ({
      role: account.role,
      'sign in with': account.phone ?? account.email,
      page: account.role === 'INVESTOR' ? '/login' : '/staff/login',
      state: account.description,
    })),
  );
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    fail(
      `A different local user already has one of the demo phone numbers or emails ` +
        `(${String(error.meta?.target ?? 'unique field')}). Remove that user, or reset the ` +
        'local database with: docker compose down -v',
    );
  }
  throw error;
} finally {
  await prisma.$disconnect();
}

async function seedAccount(account: DemoAccount, passwordHash: string) {
  const role = Role[account.role];
  const isStaff = role !== Role.INVESTOR;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        phone: account.phone,
        passwordHash,
        role,
      },
      // tokenVersion bump ends any session the account still had.
      update: {
        phone: account.phone,
        passwordHash,
        role,
        isActive: true,
        tokenVersion: { increment: 1 },
      },
      select: { id: true },
    });

    if (isStaff) {
      await tx.adminProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, name: account.name },
        // No IP allowlist, so the demo staff can sign in from anywhere locally.
        update: { name: account.name, allowedIpRange: null },
      });
    } else if (account.investorStatus === 'active') {
      await tx.investor.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          fullname: account.name,
          status: InvestorStatus.active,
          approvedAt: new Date(),
        },
        update: { status: InvestorStatus.active },
      });
    } else {
      const profile = await tx.investor.findUnique({
        where: { userId: user.id },
        select: { status: true },
      });
      if (profile) {
        console.log(
          `note: ${account.phone} already has a profile (status ${profile.status}), ` +
            'so it no longer starts at the verification wizard. ' +
            'Reset with: docker compose down -v',
        );
      }
    }

    await tx.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Lockout is keyed on the normalized identifier: lowercased email or
    // 01XXXXXXXXX phone (see normalizeIdentifier in src/auth/auth.service.ts).
    await tx.loginAttempt.deleteMany({
      where: { identifier: { in: [account.email, account.phone].filter((v): v is string => !!v) } },
    });
  });
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function fail(message: string): never {
  console.error(`seed-demo: ${message}`);
  process.exit(1);
}
