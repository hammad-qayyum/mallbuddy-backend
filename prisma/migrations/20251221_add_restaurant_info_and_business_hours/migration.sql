-- AlterTable - Add new fields to Restaurant table
ALTER TABLE "Restaurant" 
ADD COLUMN "address" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "estimatedDeliveryTime" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable - BusinessHours table
CREATE TABLE "BusinessHours" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - Unique constraint on restaurantId and dayOfWeek
CREATE UNIQUE INDEX "BusinessHours_restaurantId_dayOfWeek_key" ON "BusinessHours"("restaurantId", "dayOfWeek");

-- CreateIndex - Index on restaurantId for faster queries
CREATE INDEX "BusinessHours_restaurantId_idx" ON "BusinessHours"("restaurantId");

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
