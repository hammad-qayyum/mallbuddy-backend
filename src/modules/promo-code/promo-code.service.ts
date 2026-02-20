import prisma from "../../config/prisma";
import { ApplyPromoCodeRequest } from "./promo-code.schema";

export const promoCodeService = {
  /**
   * Get available promo codes (public list)
   * Shows currently active promo codes that users can use
   */
  async getAvailablePromoCodes() {
    try {
      const now = new Date();
      const promoCodes = await prisma.promoCode.findMany({
        where: {
          endDate: {
            gte: now, // Not expired
          },
          startDate: {
            lte: now, // Already started
          },
        },
        select: {
          id: true,
          code: true,
          discountPercentage: true,
          startDate: true,
          endDate: true,
          mall: {
            select: {
              id: true,
              name: true,
            },
          },
          Restaurant: {
            select: {
              userId: true,
              name: true,
            },
          },
        },
        orderBy: {
          endDate: "desc",
        },
      });

      return promoCodes;
    } catch (err) {
      console.error('[promoCodeService] getAvailablePromoCodes error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Get all valid (non-expired) promo codes for a specific restaurant
   * Returns promo codes that are currently active and not expired
   */
  async getValidPromoCodesByRestaurant(restaurantId: string) {
    try {
      const now = new Date();
      const promoCodes = await prisma.promoCode.findMany({
        where: {
          restaurantId: restaurantId,
          endDate: {
            gte: now, // Not expired
          },
          startDate: {
            lte: now, // Already started
          },
        },
        select: {
          id: true,
          code: true,
          discountPercentage: true,
          startDate: true,
          endDate: true,
          mall: {
            select: {
              id: true,
              name: true,
            },
          },
          Restaurant: {
            select: {
              userId: true,
              name: true,
            },
          },
        },
        orderBy: {
          endDate: "desc",
        },
      });

      return promoCodes;
    } catch (err) {
      console.error('[promoCodeService] getValidPromoCodesByRestaurant error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Validate and apply a promo code
   * Returns discount amount and validation result
   */
  async applyPromoCode(request: ApplyPromoCodeRequest) {
    try {
      const { code, restaurantId } = request;

      // Find promo code by exact code (uppercased for consistency)
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      // 1) Existence check
      if (!promoCode) {
        return {
          success: false,
          message: "Invalid promo code",
        };
      }

      const now = new Date();

      // 2) Date window validation
      if (promoCode.startDate > now) {
        return {
          success: false,
          message: "This promo code is not yet valid",
        };
      }

      if (promoCode.endDate < now) {
        return {
          success: false,
          message: "This promo code has expired",
        };
      }

      // 3) Restaurant applicability (if provided)
      if (restaurantId && promoCode.restaurantId && promoCode.restaurantId !== restaurantId) {
        return {
          success: false,
          message: "This promo code is not applicable to this restaurant",
        };
      }

      return {
        success: true,
        promoCodeId: promoCode.id,
        code: promoCode.code,
        discountPercentage: promoCode.discountPercentage,
        message: "Promo code validated successfully",
      };
    } catch (err) {
      console.error('[promoCodeService] applyPromoCode error:', (err as any)?.stack || err);
      throw err;
    }
  },

  /**
   * Track promo code usage when order is placed
   * Note: With the new simplified schema, we just link the order to the promo code
   * The Order model already has promoCodeId field
   */
  async recordPromoCodeUsage(promoCodeId: string) {
    try {
      // Verify promo code exists
      const promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      });

      if (!promoCode) {
        throw new Error("Promo code not found");
      }

      return { success: true };
    } catch (err) {
      console.error('[promoCodeService] recordPromoCodeUsage error:', (err as any)?.stack || err);
      throw err;
    }
  },
};

export default promoCodeService;