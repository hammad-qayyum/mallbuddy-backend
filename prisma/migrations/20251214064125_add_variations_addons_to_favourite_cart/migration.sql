-- DropIndex
DROP INDEX "FavouriteCartItem_favouriteCartId_menuItemId_key";

-- AlterTable
ALTER TABLE "FavouriteCartItem" ADD COLUMN     "selectedAddOns" JSONB,
ADD COLUMN     "selectedVariations" JSONB;

-- CreateIndex
CREATE INDEX "FavouriteCartItem_menuItemId_idx" ON "FavouriteCartItem"("menuItemId");
