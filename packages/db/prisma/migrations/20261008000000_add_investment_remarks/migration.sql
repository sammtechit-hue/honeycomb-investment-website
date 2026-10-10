ALTER TYPE "AuditAction" ADD VALUE 'investor_information_updated';
ALTER TYPE "LogModule" ADD VALUE 'NOMINEE' AFTER 'KYC';
ALTER TABLE "investments" ADD COLUMN "remarks" VARCHAR(255);
