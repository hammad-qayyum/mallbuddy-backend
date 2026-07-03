-- AlterEnum
-- Safe: the new value is only added here, never written in this migration
-- (Postgres forbids using a value added in the same transaction).
ALTER TYPE "Role" ADD VALUE 'MALL_ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "managedMallId" TEXT;

-- CreateIndex
CREATE INDEX "User_managedMallId_idx" ON "User"("managedMallId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedMallId_fkey" FOREIGN KEY ("managedMallId") REFERENCES "Mall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
