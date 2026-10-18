/*
  Warnings:

  - A unique constraint covering the columns `[investment_id]` on the table `incoming_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvestmentStatus" ADD VALUE 'rejected';
ALTER TYPE "InvestmentStatus" ADD VALUE 'closed';

-- AlterTable
ALTER TABLE "investors" ADD COLUMN     "totalActiveInvestmentAmout" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "totalActiveInvestmentAmout" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "incoming_payments_investment_id_key" ON "incoming_payments"("investment_id");
