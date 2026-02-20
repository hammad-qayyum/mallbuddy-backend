import { Request, Response } from "express";
import { promotionService } from "./promotion.service";
import {
  createPromotionSchema,
  updatePromotionSchema,
} from "./promotion.schema";
import { getPromotionBannerUrl } from "../../../config/upload";

export const promotionController = {
  /**
   * Create a new promotion
   * POST /restaurant/:restaurantId/promotions
   */
  async createPromotion(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;

      // Parse and validate request body
      const parseResult = createPromotionSchema.safeParse({
        ...req.body,
        restaurantId,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      // If file is uploaded, use it; otherwise use URL from body if provided
      const data = { ...parseResult.data };
      if (req.file) {
        data.banner = getPromotionBannerUrl(req.file.filename);
      }

      const promotion = await promotionService.createPromotion(data);
      return res.status(201).json({
        message: "Promotion created successfully",
        data: promotion,
      });
    } catch (error: any) {
      if (error.message === "Restaurant not found") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to create promotion" });
    }
  },

  /**
   * Get all promotions for a restaurant
   * GET /restaurant/:restaurantId/promotions
   */
  async getPromotionsByRestaurant(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({ message: "Restaurant ID is required" });
      }

      const promotions = await promotionService.getPromotionsByRestaurant(restaurantId);
      return res.json({
        message: "Promotions retrieved successfully",
        data: promotions,
      });
    } catch (error: any) {
      if (error.message === "Restaurant not found") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to retrieve promotions" });
    }
  },

  /**
   * Get a single promotion by ID
   * GET /promotions/:id
   */
  async getPromotionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Promotion ID is required" });
      }

      const promotion = await promotionService.getPromotionById(id);

      if (!promotion) {
        return res.status(404).json({ message: "Promotion not found" });
      }

      return res.json({
        message: "Promotion retrieved successfully",
        data: promotion,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to retrieve promotion" });
    }
  },

  /**
   * Update a promotion
   * PUT /promotions/:id
   */
  async updatePromotion(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Promotion ID is required" });
      }

      // Parse and validate request body
      const parseResult = updatePromotionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      // If file is uploaded, use it; otherwise use URL from body if provided
      const data = { ...parseResult.data };
      if (req.file) {
        data.banner = getPromotionBannerUrl(req.file.filename);
      }

      const promotion = await promotionService.updatePromotion(id, data);
      return res.json({
        message: "Promotion updated successfully",
        data: promotion,
      });
    } catch (error: any) {
      if (error.message === "Promotion not found") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to update promotion" });
    }
  },

  /**
   * Delete a promotion
   * DELETE /promotions/:id
   */
  async deletePromotion(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Promotion ID is required" });
      }

      await promotionService.deletePromotion(id);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message === "Promotion not found") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to delete promotion" });
    }
  },

  /**
   * Get active promotions for a restaurant
   * GET /restaurant/:restaurantId/promotions/active
   */
  async getActivePromotions(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({ message: "Restaurant ID is required" });
      }

      const promotions = await promotionService.getActivePromotions(restaurantId);
      return res.json({
        message: "Active promotions retrieved successfully",
        data: promotions,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to retrieve active promotions" });
    }
  },
};

