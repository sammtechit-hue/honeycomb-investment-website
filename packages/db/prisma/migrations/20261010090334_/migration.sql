/*
  Warnings:

  - You are about to alter the column `password_hash` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "admin_notifications" ALTER COLUMN "message" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255);
