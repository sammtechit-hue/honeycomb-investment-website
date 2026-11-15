-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "projectRate" DECIMAL(3,2);

-- AlterTable
ALTER TABLE "referral_codes" ALTER COLUMN "expiresAt" SET DEFAULT ((now() AT TIME ZONE 'Asia/Dhaka') + interval '1 year');
