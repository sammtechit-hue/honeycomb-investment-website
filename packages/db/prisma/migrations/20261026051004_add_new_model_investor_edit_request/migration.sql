-- CreateEnum
CREATE TYPE "EditRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "InvestorEditRequest" (
    "id" UUID NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "investorId" UUID NOT NULL,

    CONSTRAINT "InvestorEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestorEditRequest_investorId_status_createdAt_idx" ON "InvestorEditRequest"("investorId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "InvestorEditRequest" ADD CONSTRAINT "InvestorEditRequest_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
