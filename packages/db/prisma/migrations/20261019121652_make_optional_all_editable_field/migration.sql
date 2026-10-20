-- AlterTable
ALTER TABLE "EditableInvestor" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EditableInvestorKycDocuments" ALTER COLUMN "nidFront" DROP NOT NULL,
ALTER COLUMN "nidBack" DROP NOT NULL,
ALTER COLUMN "photo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EditableNominee" ALTER COLUMN "nominee_name" DROP NOT NULL,
ALTER COLUMN "nominee_phone" DROP NOT NULL,
ALTER COLUMN "relation" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EditableUser" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;
