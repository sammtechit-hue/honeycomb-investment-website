/*
  Warnings:

  - You are about to drop the column `investor_id` on the `EditableInvestor` table. All the data in the column will be lost.
  - You are about to drop the column `investor_id` on the `EditableInvestorKycDocuments` table. All the data in the column will be lost.
  - You are about to drop the column `investor_id` on the `EditableNominee` table. All the data in the column will be lost.
  - You are about to drop the column `investor_id` on the `EditableUser` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[editRequestId]` on the table `EditableInvestor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[editRequestId]` on the table `EditableInvestorKycDocuments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[editRequestId]` on the table `EditableNominee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[editRequestId]` on the table `EditableUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `editRequestId` to the `EditableInvestor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editRequestId` to the `EditableInvestorKycDocuments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editRequestId` to the `EditableNominee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editRequestId` to the `EditableUser` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EditableInvestor" DROP CONSTRAINT "EditableInvestor_investor_id_fkey";

-- DropForeignKey
ALTER TABLE "EditableInvestorKycDocuments" DROP CONSTRAINT "EditableInvestorKycDocuments_investor_id_fkey";

-- DropForeignKey
ALTER TABLE "EditableNominee" DROP CONSTRAINT "EditableNominee_investor_id_fkey";

-- DropForeignKey
ALTER TABLE "EditableUser" DROP CONSTRAINT "EditableUser_investor_id_fkey";

-- AlterTable
ALTER TABLE "EditableInvestor" DROP COLUMN "investor_id",
ADD COLUMN     "editRequestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "EditableInvestorKycDocuments" DROP COLUMN "investor_id",
ADD COLUMN     "editRequestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "EditableNominee" DROP COLUMN "investor_id",
ADD COLUMN     "editRequestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "EditableUser" DROP COLUMN "investor_id",
ADD COLUMN     "editRequestId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EditableInvestor_editRequestId_key" ON "EditableInvestor"("editRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "EditableInvestorKycDocuments_editRequestId_key" ON "EditableInvestorKycDocuments"("editRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "EditableNominee_editRequestId_key" ON "EditableNominee"("editRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "EditableUser_editRequestId_key" ON "EditableUser"("editRequestId");

-- AddForeignKey
ALTER TABLE "EditableInvestor" ADD CONSTRAINT "EditableInvestor_editRequestId_fkey" FOREIGN KEY ("editRequestId") REFERENCES "InvestorEditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditableInvestorKycDocuments" ADD CONSTRAINT "EditableInvestorKycDocuments_editRequestId_fkey" FOREIGN KEY ("editRequestId") REFERENCES "InvestorEditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditableNominee" ADD CONSTRAINT "EditableNominee_editRequestId_fkey" FOREIGN KEY ("editRequestId") REFERENCES "InvestorEditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditableUser" ADD CONSTRAINT "EditableUser_editRequestId_fkey" FOREIGN KEY ("editRequestId") REFERENCES "InvestorEditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
