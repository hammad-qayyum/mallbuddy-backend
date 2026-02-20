-- DropIndex
DROP INDEX "CartItem_cartId_menuItemId_key";

-- CreateIndex
CREATE INDEX "CartItem_menuItemId_idx" ON "CartItem"("menuItemId");
