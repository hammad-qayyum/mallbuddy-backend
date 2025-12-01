/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Mall` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Mall` table. All the data in the column will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Restaurant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cityId` to the `Mall` table without a default value. This is not possible if the table is not empty.
  - Made the column `firstName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phoneNumber` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Restaurant" DROP CONSTRAINT "Restaurant_mallId_fkey";

-- DropIndex
DROP INDEX "Mall_name_idx";

-- DropIndex
DROP INDEX "Mall_name_key";

-- AlterTable
ALTER TABLE "Mall" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "cityId" TEXT NOT NULL,
ADD COLUMN     "image" TEXT,
ALTER COLUMN "address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "phoneNumber" SET NOT NULL;

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "Restaurant";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "RestaurantStatus";

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMallSelection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mallId" TEXT NOT NULL,

    CONSTRAINT "UserMallSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMallSelection_userId_key" ON "UserMallSelection"("userId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mall" ADD CONSTRAINT "Mall_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMallSelection" ADD CONSTRAINT "UserMallSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMallSelection" ADD CONSTRAINT "UserMallSelection_mallId_fkey" FOREIGN KEY ("mallId") REFERENCES "Mall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
