import { Request, Response } from "express";
import { adminPromoCodeService } from "./promo-code.service";
import { createPromoCodeSchema, updatePromoCodeSchema } from "./promo-code.schema";

export const adminPromoCodeController = {
  // Admin: Create promo code
  async createPromoCode(req: Request, res: Response) {
    try {
      const validatedData = createPromoCodeSchema.parse(req.body);
      const promoCode = await adminPromoCodeService.createPromoCode(validatedData);
      
      return res.status(201).json({
        success: true,
        message: "Promo code created successfully",
        data: promoCode,
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: err.errors,
        });
      }
      if (err.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Promo code already exists. Please use a unique code.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create promo code",
        error: err.message,
      });
    }
  },

  // Admin: Get all promo codes
  async getAllPromoCodes(req: Request, res: Response) {
    try {
      const promoCodes = await adminPromoCodeService.getAllPromoCodes();
      
      return res.json({
        success: true,
        data: promoCodes,
        total: promoCodes.length,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch promo codes",
        error: err.message,
      });
    }
  },

  // Admin: Get promo code by ID
  async getPromoCodeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Promo code ID is required",
        });
      }
      
      const promoCode = await adminPromoCodeService.getPromoCodeById(id);
      
      if (!promoCode) {
        return res.status(404).json({
          success: false,
          message: "Promo code not found",
        });
      }
      
      return res.json({
        success: true,
        data: promoCode,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch promo code",
        error: err.message,
      });
    }
  },

  // Admin: Update promo code
  async updatePromoCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Promo code ID is required",
        });
      }
      
      const validatedData = updatePromoCodeSchema.parse(req.body);
      
      const promoCode = await adminPromoCodeService.updatePromoCode(id, validatedData);
      
      return res.json({
        success: true,
        message: "Promo code updated successfully",
        data: promoCode,
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: err.errors,
        });
      }
      if (err.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Promo code not found",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to update promo code",
        error: err.message,
      });
    }
  },

  // Admin: Delete promo code
  async deletePromoCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Promo code ID is required",
        });
      }
      
      const result = await adminPromoCodeService.deletePromoCode(id);
      
      return res.json(result);
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Promo code not found",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to delete promo code",
        error: err.message,
      });
    }
  },

  // Admin: Get valid promo codes by restaurant ID
  async getValidPromoCodesByRestaurant(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: "Restaurant ID is required",
        });
      }

      const promoCodes = await adminPromoCodeService.getValidPromoCodesByRestaurant(restaurantId);

      return res.json({
        success: true,
        data: promoCodes,
        total: promoCodes.length,
        message: promoCodes.length === 0 ? "No valid promo codes found for this restaurant" : undefined,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch restaurant promo codes",
        error: err.message,
      });
    }
  },

  // Admin: Search promo codes by code name
  async searchPromoCodes(req: Request, res: Response) {
    try {
      const { search } = req.query;
      
      // More flexible validation - accept any truthy value
      if (!search) {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      const searchTerm = String(search).trim();
      
      if (searchTerm.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Search term cannot be empty",
        });
      }
      
      const promoCodes = await adminPromoCodeService.searchPromoCodes(searchTerm);
      
      // Return empty array instead of error when no results found
      return res.json({
        success: true,
        data: promoCodes,
        total: promoCodes.length,
        message: promoCodes.length === 0 ? "No promo codes found" : undefined,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to search promo codes",
        error: err.message,
      });
    }
  },
};
