-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'profit_ledger_settings_set';
ALTER TYPE "AuditAction" ADD VALUE 'profit_ledger_settings_updated';

-- CreateTable
CREATE TABLE "MonthlyProfitLedgerSettings" (
    "id" SERIAL NOT NULL,
    "setcycleday" INTEGER NOT NULL,
    "label" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyProfitLedgerSettings_pkey" PRIMARY KEY ("id")
);
