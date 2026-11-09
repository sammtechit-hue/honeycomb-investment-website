-- CreateEnum
CREATE TYPE "DisbursementItemType" AS ENUM ('roi', 'principal_withdrawal', 'referral_bonus');

-- AlterEnum
ALTER TYPE "WithdrawalStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "disbursement_items" ADD COLUMN     "investor_note" VARCHAR(500),
ADD COLUMN     "type" "DisbursementItemType" NOT NULL DEFAULT 'roi';

-- AlterTable: existing rows were calculated on the full investment amount.
ALTER TABLE "monthly_profit_ledger" ADD COLUMN     "principal_amount" DECIMAL(14,2);

UPDATE "monthly_profit_ledger" m
SET "principal_amount" = i."amount"
FROM "investments" i
WHERE m."investment_id" = i."id";

ALTER TABLE "monthly_profit_ledger" ALTER COLUMN "principal_amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "cancel_reason" VARCHAR(500),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "final_roi_amount" DECIMAL(14,2),
ADD COLUMN     "final_roi_days" INTEGER,
ADD COLUMN     "override_reason" VARCHAR(500),
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- @updatedAt is set by Prisma, not the database.
ALTER TABLE "withdrawal_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Fill a missing notice: 40 days up to 2,00,000, +20 per further 1,00,000 or part.
UPDATE "withdrawal_requests"
SET "notice_period_days" = 40 + 20 * CEIL(GREATEST("requested_amount" - 200000, 0) / 100000.0)::INTEGER
WHERE "notice_period_days" IS NULL;

UPDATE "withdrawal_requests"
SET "notice_period_end" = "request_date" + "notice_period_days"
WHERE "notice_period_end" IS NULL;

ALTER TABLE "withdrawal_requests" ALTER COLUMN "notice_period_days" SET NOT NULL,
ALTER COLUMN "notice_period_end" SET NOT NULL;
