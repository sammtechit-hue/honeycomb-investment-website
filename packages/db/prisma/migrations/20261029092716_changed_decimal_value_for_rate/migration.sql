/*
  Warnings:

  - You are about to alter the column `rate_applied` on the `monthly_profit_ledger` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(3,2)`.
  - You are about to alter the column `rate_percent` on the `monthly_rate_settings` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(3,2)`.

*/
-- AlterTable
ALTER TABLE "monthly_profit_ledger" ALTER COLUMN "rate_applied" SET DATA TYPE DECIMAL(3,2);

-- AlterTable
ALTER TABLE "monthly_rate_settings" ALTER COLUMN "rate_percent" SET DATA TYPE DECIMAL(3,2);
