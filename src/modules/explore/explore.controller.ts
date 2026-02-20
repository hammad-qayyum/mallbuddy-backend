import { Request, Response } from "express";
import { exploreService } from "./explore.service";
import { z } from "zod";

// Define the param schema directly if import fails
const restaurantDetailParamsSchema = z.object({
  restaurantId: z.string(),
});

export const exploreController = {
  async getExplore(req: Request, res: Response) {
    try {
      const restaurants = await exploreService.getExploreRestaurants();
      return res.json({ success: true, data: restaurants });
    } catch (error: any) {
      console.error('[explore] getExplore error:', error?.stack || error);
      return res.status(500).json({ success: false, message: 'Failed to fetch explore restaurants', error: error?.message });
    }
  },

  async getExploreDetail(req: Request, res: Response) {
    const parseResult = restaurantDetailParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID", errors: parseResult.error.flatten() });
    }
    try {
      const { restaurantId } = parseResult.data;
      const restaurant = await exploreService.getExploreRestaurantDetail(restaurantId);
      if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
      return res.json({ success: true, data: restaurant });
    } catch (error: any) {
      console.error('[explore] getExploreDetail error:', error?.stack || error);
      return res.status(500).json({ success: false, message: 'Failed to fetch restaurant details', error: error?.message });
    }
  },

  async getStory(req: Request, res: Response) {
    const parseResult = restaurantDetailParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID", errors: parseResult.error.flatten() });
    }
    try {
      const { restaurantId } = parseResult.data;
      const data = await exploreService.getRestaurantStory(restaurantId);
      if (!data) return res.status(404).json({ success: false, message: 'Restaurant not found' });
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('[explore] getStory error:', error?.stack || error);
      return res.status(500).json({ success: false, message: 'Failed to fetch restaurant story', error: error?.message });
    }
  },

  // The gallery route is handled by galleryController; exploreController keeps explore-specific handlers only.
};

export default exploreController;
