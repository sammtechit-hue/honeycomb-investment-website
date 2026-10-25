/*
  Warnings:

  - You are about to drop the column `period_month` on the `monthly_profit_ledger` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[investment_id,cycle_start]` on the table `monthly_profit_ledger` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cycle_end` to the `monthly_profit_ledger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cycle_start` to the `monthly_profit_ledger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `days_counted` to the `monthly_profit_ledger` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "monthly_profit_ledger_investment_id_period_month_key";

-- DropIndex
DROP INDEX "monthly_profit_ledger_period_month_idx";

-- AlterTable
ALTER TABLE "investments" ALTER COLUMN "investment_date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "monthly_profit_ledger" DROP COLUMN "period_month",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cycle_end" DATE NOT NULL,
ADD COLUMN     "cycle_start" DATE NOT NULL,
ADD COLUMN     "days_counted" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "monthly_rate_settings" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "monthly_profit_ledger_cycle_end_idx" ON "monthly_profit_ledger"("cycle_end");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_profit_ledger_investment_id_cycle_start_key" ON "monthly_profit_ledger"("investment_id", "cycle_start");
