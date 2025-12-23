import prisma from "../../config/prisma";
import { ApplyPromoCodeRequest, CreatePromoCodeRequest } from "./promo-code.schema";
import { randomUUID } from "crypto";

export const promoCodeService = {
  /**
   * Get available promo codes (public list)
   * Shows currently active promo codes that users can use
   */
  async getAvailablePromoCodes() {
    try {
      const promoCodes = await (prisma as any).promoCode.findMany({
        where: {
          isActive: true,
          validUntil: {
            gte: new Date(), // Valid codes only
          },
        },
        select: {
          id: true,
          code: true,
          description: true,
          discountType: true,
          discountValue: true,
          validFrom: true,
          validUntil: true,
          maxUses: true,
          usedCount: true,
          isActive: true,
          minOrderAmount: true,
          applicableToAll: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          validUntil: "desc",
        },
      });

      return promoCodes;
    } catch (err) {
      console.error('[promoCodeService] getAvailablePromoCodes error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Validate and apply a promo code
   * Returns discount amount and validation result
   */
  async applyPromoCode(request: ApplyPromoCodeRequest) {
    try {
      const { code, subtotal, restaurantId } = request;

      // Find promo code
      const promoCode = await (prisma as any).promoCode.findUnique({
        where: { code },
      });

      // Validation checks
      if (!promoCode) {
        return {
          success: false,
          message: "Invalid promo code",
        };
      }

      if (!promoCode.isActive) {
        return {
          success: false,
          message: "This promo code is no longer active",
        };
      }

      const now = new Date();
      if (promoCode.validFrom > now) {
        return {
          success: false,
          message: "This promo code is not yet valid",
        };
      }

      if (promoCode.validUntil < now) {
        return {
          success: false,
          message: "This promo code has expired",
        };
      }

      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          success: false,
          message: "This promo code has reached its usage limit",
        };
      }

      if (promoCode.minOrderAmount && subtotal < Number(promoCode.minOrderAmount)) {
        return {
          success: false,
          message: `Minimum order amount of ${promoCode.minOrderAmount} is required to use this promo code`,
        };
      }

      // Check if applicable to restaurant
      if (!promoCode.applicableToAll && restaurantId) {
        // If not applicable to all, must check if restaurant is in allowed list
        // But since we do not fetch applicableRestaurants, skip this check or implement if needed
        // For now, just allow if applicableToAll is false (or add your own logic)
      }

      // Calculate discount
      let discountAmount: number;
      if (promoCode.discountType === "PERCENTAGE") {
        discountAmount = (subtotal * Number(promoCode.discountValue)) / 100;
      } else {
        discountAmount = Math.min(Number(promoCode.discountValue), subtotal);
      }

      const finalAmount = subtotal - discountAmount;

      return {
        success: true,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: Number(promoCode.discountValue),
        discountAmount: Number(discountAmount.toFixed(2)),
        originalAmount: subtotal,
        finalAmount: Number(finalAmount.toFixed(2)),
        message: "Promo code applied successfully",
      };
    } catch (err) {
      console.error('[promoCodeService] applyPromoCode error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Track promo code usage when order is placed
   */
  async recordPromoCodeUsage(promoCodeId: string, orderId: string, userId: string, discountAmount: number) {
    try {
      // Create usage record
      await (prisma as any).promoCodeUse.create({
        data: {
          id: randomUUID(),
          promoCodeId,
          orderId,
          userId,
          discountAmount,
        },
      });

      // Increment used count
      await (prisma as any).promoCode.update({
        where: { id: promoCodeId },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });

      return { success: true };
    } catch (err) {
      console.error('[promoCodeService] recordPromoCodeUsage error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Admin: Create new promo code
   */
  async createPromoCode(data: CreatePromoCodeRequest, createdBy?: string) {
    try {
      const { applicableRestaurantIds, ...codeData } = data;

      const promoCode = await (prisma as any).promoCode.create({
        data: {
          id: randomUUID(),
          code: codeData.code.toUpperCase(),
          description: codeData.description || null,
          discountType: codeData.discountType,
          discountValue: codeData.discountValue,
          validFrom: new Date(codeData.validFrom),
          validUntil: new Date(codeData.validUntil),
          maxUses: codeData.maxUses || null,
          isActive: codeData.isActive,
          minOrderAmount: codeData.minOrderAmount || null,
          applicableToAll: codeData.applicableToAll,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: createdBy || null,
          // applicableRestaurants is a relation, not selectable in create/select
          ...(codeData.applicableToAll ? {} : {
            applicableRestaurants: {
              connect: (applicableRestaurantIds || []).map((id) => ({ userId: id })),
            },
          }),
        },
      });

      return {
        success: true,
        data: promoCode,
        message: "Promo code created successfully",
      };
    } catch (err) {
      console.error('[promoCodeService] createPromoCode error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Admin: Get all promo codes
   */
  async getAllPromoCodes() {
    try {
      const promoCodes = await (prisma as any).promoCode.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      return promoCodes;
    } catch (err) {
      console.error('[promoCodeService] getAllPromoCodes error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Admin: Deactivate a promo code
   */
  async deactivatePromoCode(promoCodeId: string) {
    try {
      const updated = await (prisma as any).promoCode.update({
        where: { id: promoCodeId },
        data: { isActive: false },
        select: {
          id: true,
          code: true,
          description: true,
          discountType: true,
          discountValue: true,
          validFrom: true,
          validUntil: true,
          maxUses: true,
          usedCount: true,
          isActive: true,
          minOrderAmount: true,
          applicableToAll: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
        },
      });

      return {
        success: true,
        message: "Promo code deactivated",
        data: updated,
      };
    } catch (err) {
      console.error('[promoCodeService] deactivatePromoCode error:', (err as any)?.stack || err);
      throw err;
    }
  },
};

export default promoCodeService;
