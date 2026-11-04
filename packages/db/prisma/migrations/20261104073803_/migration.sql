-- DropForeignKey
ALTER TABLE "disbursement_items" DROP CONSTRAINT "disbursement_items_batch_id_fkey";

-- AlterTable
ALTER TABLE "disbursement_items" ALTER COLUMN "batch_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "disbursement_items" ADD CONSTRAINT "disbursement_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "disbursement_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
