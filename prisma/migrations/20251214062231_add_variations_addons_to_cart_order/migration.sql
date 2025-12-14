-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "selectedAddOns" JSONB,
ADD COLUMN     "selectedVariations" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "selectedAddOns" JSONB,
ADD COLUMN     "selectedVariations" JSONB;
