/*
  Warnings:

  - Added the required column `monthLabel` to the `payout_windows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearLabel` to the `payout_windows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payout_windows" ADD COLUMN     "monthLabel" TEXT NOT NULL,
ADD COLUMN     "yearLabel" INTEGER NOT NULL;
