/*
  Warnings:

  - You are about to drop the column `slot` on the `disbursement_batches` table. All the data in the column will be lost.
  - You are about to drop the column `disbursement_slot` on the `investments` table. All the data in the column will be lost.
  - Added the required column `window_id` to the `disbursement_batches` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PayoutWindowStatus" AS ENUM ('open', 'completed');

-- DropIndex
DROP INDEX "disbursement_batches_slot_batch_date_idx";

-- AlterTable
ALTER TABLE "disbursement_batches" DROP COLUMN "slot",
ADD COLUMN     "window_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "disbursement_items" ADD COLUMN     "isDisbursed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "investments" DROP COLUMN "disbursement_slot";

-- DropEnum
DROP TYPE "DisbursementSlot";

-- CreateTable
CREATE TABLE "payout_windows" (
    "id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PayoutWindowStatus" NOT NULL DEFAULT 'open',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payout_windows_period_month_key" ON "payout_windows"("period_month");

-- CreateIndex
CREATE INDEX "payout_windows_status_end_date_idx" ON "payout_windows"("status", "end_date");

-- AddForeignKey
ALTER TABLE "disbursement_batches" ADD CONSTRAINT "disbursement_batches_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "payout_windows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
