import { Request, Response } from "express";
import promoCodeService from "./promo-code.service";
import { applyPromoCodeSchema } from "./promo-code.schema";

export const promoCodeController = {
  /**
   * GET /promo-codes
   * Get list of available promo codes
   * Public endpoint - for checkout screen
   */
  async getAvailablePromoCodes(req: Request, res: Response) {
    try {
      const promoCodes = await promoCodeService.getAvailablePromoCodes();

      return res.json({
        success: true,
        data: promoCodes,
        totalCount: promoCodes.length,
      });
    } catch (error: any) {
      console.error('[promoCodeController] getAvailablePromoCodes error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch promo codes",
      });
    }
  },

  /**
   * GET /promo-codes/restaurant/:restaurantId
   * Get all valid promo codes for a specific restaurant
   * Public endpoint - for restaurant-specific promos
   */
  async getValidPromoCodesByRestaurant(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: "Restaurant ID is required",
        });
      }

      const promoCodes = await promoCodeService.getValidPromoCodesByRestaurant(restaurantId);

      return res.json({
        success: true,
        data: promoCodes,
        totalCount: promoCodes.length,
      });
    } catch (error: any) {
      console.error('[promoCodeController] getValidPromoCodesByRestaurant error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch restaurant promo codes",
      });
    }
  },

  /**
   * POST /promo-codes/apply
   * Apply a promo code to an order
   * Public endpoint - validate and calculate discount
   */
  async applyPromoCode(req: Request, res: Response) {
    try {
      const validation = applyPromoCodeSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid request",
          errors: validation.error.flatten(),
        });
      }

      const result = await promoCodeService.applyPromoCode(validation.data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      return res.json(result);
    } catch (error: any) {
      console.error('[promoCodeController] applyPromoCode error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        message: "Failed to apply promo code",
      });
    }
  },
};

export default promoCodeController;
