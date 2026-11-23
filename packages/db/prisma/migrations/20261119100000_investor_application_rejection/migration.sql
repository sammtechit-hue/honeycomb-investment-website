-- An investor's application (profile, documents and first investment) can be
-- rejected with a reason; the investor then edits it and resubmits.
ALTER TYPE "InvestorStatus" ADD VALUE 'rejected';

ALTER TABLE "investors" ADD COLUMN "rejection_reason" VARCHAR(500),
ADD COLUMN "rejected_at" TIMESTAMP(3);
