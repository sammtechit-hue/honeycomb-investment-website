-- CreateTable
CREATE TABLE "EditableInvestor" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "profession" VARCHAR(150),
    "workplace" VARCHAR(150),
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "EditableInvestor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditableInvestorKycDocuments" (
    "id" UUID NOT NULL,
    "nidFront" TEXT NOT NULL,
    "nidBack" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "EditableInvestorKycDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditableNominee" (
    "id" UUID NOT NULL,
    "nominee_name" VARCHAR(150) NOT NULL,
    "nomineeNidFront" VARCHAR(500),
    "nomineeNidBack" VARCHAR(500),
    "nominee_photo" TEXT,
    "nominee_phone" VARCHAR(20) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "EditableNominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditableUser" (
    "id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "EditableUser_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EditableInvestor" ADD CONSTRAINT "EditableInvestor_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditableInvestorKycDocuments" ADD CONSTRAINT "EditableInvestorKycDocuments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditableNominee" ADD CONSTRAINT "EditableNominee_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditableUser" ADD CONSTRAINT "EditableUser_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
