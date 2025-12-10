/*
  Warnings:

  - The values [VENDOR,DELIVERY_PERSON] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `image` on the `Mall` table. All the data in the column will be lost.
  - You are about to drop the `UserMallSelection` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,countryId]` on the table `City` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Country` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,cityId]` on the table `Mall` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN', 'RESTAURANT');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "UserMallSelection" DROP CONSTRAINT "UserMallSelection_mallId_fkey";

-- DropForeignKey
ALTER TABLE "UserMallSelection" DROP CONSTRAINT "UserMallSelection_userId_fkey";

-- AlterTable
ALTER TABLE "Mall" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedCityId" TEXT,
ADD COLUMN     "selectedCountryId" TEXT,
ADD COLUMN     "selectedMallId" TEXT;

-- DropTable
DROP TABLE "UserMallSelection";

-- CreateTable
CREATE TABLE "Restaurant" (
    "userId" TEXT NOT NULL,
    "banner" TEXT,
    "description" TEXT,
    "location" TEXT,
    "mallId" TEXT NOT NULL,
    "mainCategory" TEXT NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CuisineCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "mallId" TEXT NOT NULL,

    CONSTRAINT "CuisineCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sortOrder" INTEGER,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "preparationTime" TEXT,
    "image" TEXT,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_countryId_key" ON "City"("name", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Mall_name_cityId_key" ON "Mall"("name", "cityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedCountryId_fkey" FOREIGN KEY ("selectedCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedCityId_fkey" FOREIGN KEY ("selectedCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedMallId_fkey" FOREIGN KEY ("selectedMallId") REFERENCES "Mall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_mallId_fkey" FOREIGN KEY ("mallId") REFERENCES "Mall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuisineCategory" ADD CONSTRAINT "CuisineCategory_mallId_fkey" FOREIGN KEY ("mallId") REFERENCES "Mall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
