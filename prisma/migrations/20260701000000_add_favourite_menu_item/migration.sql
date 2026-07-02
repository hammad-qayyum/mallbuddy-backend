-- CreateTable
CREATE TABLE "FavouriteMenuItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavouriteMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavouriteMenuItem_userId_idx" ON "FavouriteMenuItem"("userId");

-- CreateIndex
CREATE INDEX "FavouriteMenuItem_menuItemId_idx" ON "FavouriteMenuItem"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "FavouriteMenuItem_userId_menuItemId_key" ON "FavouriteMenuItem"("userId", "menuItemId");

-- AddForeignKey
ALTER TABLE "FavouriteMenuItem" ADD CONSTRAINT "FavouriteMenuItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavouriteMenuItem" ADD CONSTRAINT "FavouriteMenuItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
