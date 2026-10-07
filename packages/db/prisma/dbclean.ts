/**
 * dbclean.ts — delete all investors + INVESTOR users from the database.
 *
 * Default (safe): wipes every investor-owned row but PRESERVES admin /
 * moderator / super-admin users, projects, batches, rates, company docs, etc.
 *
 *   cd packages/db
 *   node --env-file=.env prisma/dbclean.ts
 *
 * Full wipe (also deletes admins — you will need to re-run
 * apps/api/scripts/create-super-admin.mts afterwards):
 *
 *   node --env-file=.env prisma/dbclean.ts --all
 *
 * Requires Node >= 22.6 (native --env-file + type-stripping for .ts).
 * DATABASE_URL is read from the environment (.env).
 */
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Pass --all (or --include-admins) to also delete admin/moderator users.
// Without it, only users with role INVESTOR are deleted.
const includeAll =
  process.argv.includes('--all') || process.argv.includes('--include-admins');

async function main() {
  console.log(
    includeAll
      ? 'dbclean: FULL wipe — deleting ALL investors and ALL users (including admins)…'
      : 'dbclean: deleting all investors + INVESTOR users (admins preserved)…',
  );

  // ------------------------------------------------------------------
  // 1. Investment subtree (must go before Investment/Investor because
  //    the FKs are RESTRICT — no onDelete: Cascade on these relations).
  //    Ledger + Withdrawal reference DisbursementItem, so they go first.
  // ------------------------------------------------------------------
  const ledger = await prisma.monthlyProfitLedger.deleteMany({});
  console.log(`  monthlyProfitLedger: ${ledger.count}`);

  const withdrawals = await prisma.withdrawalRequest.deleteMany({});
  console.log(`  withdrawalRequest:   ${withdrawals.count}`);

  const items = await prisma.disbursementItem.deleteMany({});
  console.log(`  disbursementItem:    ${items.count}`);

  const incoming = await prisma.incomingPayment.deleteMany({});
  console.log(`  incomingPayment:     ${incoming.count}`);

  const invDocs = await prisma.investmentDocument.deleteMany({});
  console.log(`  investmentDocument:  ${invDocs.count}`);

  const investments = await prisma.investment.deleteMany({});
  console.log(`  investment:          ${investments.count}`);

  // ------------------------------------------------------------------
  // 2. Referrals (Referral depends on ReferralCode + both Investor sides,
  //    so Referral goes before ReferralCode/Investor).
  // ------------------------------------------------------------------
  const referrals = await prisma.referral.deleteMany({});
  console.log(`  referral:            ${referrals.count}`);

  const codes = await prisma.referralCode.deleteMany({});
  console.log(`  referralCode:        ${codes.count}`);

  // ------------------------------------------------------------------
  // 3. Investor profile children.
  // ------------------------------------------------------------------
  const kyc = await prisma.investorKycDocument.deleteMany({});
  console.log(`  investorKycDocument: ${kyc.count}`);

  const bank = await prisma.investorBankAccount.deleteMany({});
  console.log(`  investorBankAccount: ${bank.count}`);

  const nominees = await prisma.nominee.deleteMany({});
  console.log(`  nominee:             ${nominees.count}`);

  const investors = await prisma.investor.deleteMany({});
  console.log(`  investor:            ${investors.count}`);

  // ------------------------------------------------------------------
  // 4. Users. Auth tokens (refresh/blacklisted/password) are
  //    onDelete: Cascade from User, so deleting the User removes them.
  // ------------------------------------------------------------------
  if (includeAll) {
    // AuditLog restricts AdminProfile deletion, so clear it first.
    const audit = await prisma.auditLog.deleteMany({});
    console.log(`  auditLog:            ${audit.count}`);

    const users = await prisma.user.deleteMany({});
    console.log(`  user (ALL roles):    ${users.count}`);
  } else {
    const users = await prisma.user.deleteMany({
      where: { role: Role.INVESTOR },
    });
    console.log(`  user (INVESTOR):     ${users.count}`);
  }

  // Stale failed-login counters are keyed by email/phone identifier —
  // clear them so re-registered accounts don't start out locked.
  const attempts = await prisma.loginAttempt.deleteMany({});
  console.log(`  loginAttempt:        ${attempts.count}`);

  console.log('dbclean: done.');
}

try {
  await main();
} catch (err) {
  console.error('dbclean: FAILED', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}


// node --env-file=.env prisma/dbclean.ts