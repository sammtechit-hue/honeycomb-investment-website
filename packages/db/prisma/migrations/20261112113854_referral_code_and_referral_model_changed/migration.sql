/*
  Warnings:

  - You are about to drop the column `expires_at` on the `referral_codes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[referral_code_id]` on the table `referrals` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "referral_codes_expires_at_idx";

-- AlterTable
ALTER TABLE "referral_codes" DROP COLUMN "expires_at",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Dhaka') + interval '1 year'),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "referral_codes_expiresAt_idx" ON "referral_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_id_key" ON "referrals"("referral_code_id");
