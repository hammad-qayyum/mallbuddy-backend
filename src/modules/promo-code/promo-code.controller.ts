import { Request, Response } from "express";
import promoCodeService from "./promo-code.service";
import { applyPromoCodeSchema, createPromoCodeSchema } from "./promo-code.schema";

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

  /**
   * POST /admin/promo-codes
   * Create a new promo code (Admin only)
   */
  async createPromoCode(req: Request, res: Response) {
    try {
      const validation = createPromoCodeSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid request",
          errors: validation.error.flatten(),
        });
      }

      const result = await promoCodeService.createPromoCode(validation.data);

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('[promoCodeController] createPromoCode error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        message: "Failed to create promo code",
      });
    }
  },

  /**
   * GET /admin/promo-codes
   * Get all promo codes (Admin only)
   */
  async getAllPromoCodes(req: Request, res: Response) {
    try {
      const promoCodes = await promoCodeService.getAllPromoCodes();

      return res.json({
        success: true,
        data: promoCodes,
        totalCount: promoCodes.length,
      });
    } catch (error: any) {
      console.error('[promoCodeController] getAllPromoCodes error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch promo codes",
      });
    }
  },

  /**
   * PATCH /admin/promo-codes/:promoCodeId/deactivate
   * Deactivate a promo code (Admin only)
   */
  async deactivatePromoCode(req: Request, res: Response) {
    try {
      const { promoCodeId } = req.params;

      if (!promoCodeId) {
        return res.status(400).json({
          success: false,
          message: "Promo code ID is required",
        });
      }

      const result = await promoCodeService.deactivatePromoCode(promoCodeId);

      return res.json(result);
    } catch (error: any) {
      console.error('[promoCodeController] deactivatePromoCode error:', error?.stack || error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Promo code not found",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate promo code",
      });
    }
  },
};

export default promoCodeController;
