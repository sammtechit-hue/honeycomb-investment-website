/*
  Warnings:

  - Changed the type of `monthLabel` on the `payout_windows` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Month" AS ENUM ('JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER');

-- AlterTable
ALTER TABLE "payout_windows" DROP COLUMN "monthLabel",
ADD COLUMN     "monthLabel" "Month" NOT NULL;
