-- AlterTable
ALTER TABLE "investments" ADD COLUMN     "contract_file_key" TEXT,
ADD COLUMN     "contract_generated_at" TIMESTAMP(3),
ADD COLUMN     "contract_signatory_id" UUID;

-- AlterTable
ALTER TABLE "investors" ADD COLUMN     "nid_number" VARCHAR(20);

-- AlterTable
ALTER TABLE "nominees" ADD COLUMN     "nominee_nid_number" VARCHAR(20);

-- CreateTable
CREATE TABLE "investor_guarantors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nid" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "investor_guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signatories" (
    "id" UUID NOT NULL,
    "receiver_name" VARCHAR(150) NOT NULL,
    "receiver_nid" VARCHAR(20) NOT NULL,
    "receiver_phone" VARCHAR(20) NOT NULL,
    "receiver_signature" TEXT,
    "guarantor_name" VARCHAR(150) NOT NULL,
    "guarantor_nid" VARCHAR(20) NOT NULL,
    "guarantor_phone" VARCHAR(20) NOT NULL,
    "guarantor_relation" VARCHAR(50) NOT NULL,
    "guarantor_signature" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_signatories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investor_guarantors_investor_id_key" ON "investor_guarantors"("investor_id");

-- CreateIndex
CREATE INDEX "contract_signatories_is_active_idx" ON "contract_signatories"("is_active");

-- AddForeignKey
ALTER TABLE "investor_guarantors" ADD CONSTRAINT "investor_guarantors_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_contract_signatory_id_fkey" FOREIGN KEY ("contract_signatory_id") REFERENCES "contract_signatories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

