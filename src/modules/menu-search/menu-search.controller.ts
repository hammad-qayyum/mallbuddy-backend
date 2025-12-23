import { Request, Response } from "express";
import menuSearchService from "./menu-search.service";
import { menuSearchParamsSchema } from "./menu-search.schema";

export const menuSearchController = {
  /**
   * GET /restaurant/:restaurantId/menu/search
   * Search for menu items within a restaurant by name or description
   * Public endpoint - anyone can search
   */
  async searchMenu(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const { q } = req.query;

      // Validate input
      const validation = menuSearchParamsSchema.safeParse({
        restaurantId,
        q,
      });

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid search parameters",
          errors: validation.error.flatten(),
        });
      }

      const result = await menuSearchService.searchMenuItems(validation.data.restaurantId, validation.data.q);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      if (result.totalResults === 0) {
        return res.status(404).json({
          success: false,
          message: `No menu items or categories found for "${result.query}"`,
        });
      }

      return res.json(result);
    } catch (error: any) {
      console.error('[menuSearchController] searchMenu error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        message: "Error searching menu items",
      });
    }
  },
};

export default menuSearchController;
