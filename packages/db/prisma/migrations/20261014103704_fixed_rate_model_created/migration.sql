-- CreateTable
CREATE TABLE "FixedRate" (
    "id" SERIAL NOT NULL,
    "rate" DECIMAL(2,2),
    "label" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedRate_pkey" PRIMARY KEY ("id")
);
