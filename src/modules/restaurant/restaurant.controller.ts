import { Request, Response } from "express";
import { restaurantService } from "./restaurant.service";
import { createRestaurantSchema, updateRestaurantSchema } from "./restaurant.schema";
import { getRestaurantBannerUrl } from "../../config/upload";

export const restaurantController = {
  // POST /admin/restaurants
  async create(req: Request, res: Response) {
    const parseResult = createRestaurantSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    // If file is uploaded, use it; otherwise use URL from body if provided
    const data = { ...parseResult.data };
    if (req.file) {
      data.banner = getRestaurantBannerUrl(req.file.filename);
    }

    const restaurant = await restaurantService.createRestaurant(data);
    return res.status(201).json(restaurant);
  },

  // GET /malls/:mallId/restaurants
  async getAll(req: Request, res: Response) {
    const { mallId } = req.params;
    const { category, page, limit } = req.query;

    if (!mallId) return res.status(400).json({ message: "Mall ID is required" });

    const data = await restaurantService.getAllRestaurants(
      mallId,
      category as string,
      Number(page) || 1,
      Number(limit) || 10
    );

    return res.json(data);
  },

  // GET /restaurants/:restaurantId/details
  async getDetails(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });

    const restaurant = await restaurantService.getRestaurantDetails(restaurantId);

    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    return res.json(restaurant);
  },

  // PATCH /admin/restaurants/:restaurantId
  async update(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });

    const parseResult = updateRestaurantSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    // If file is uploaded, use it; otherwise use URL from body if provided
    const data = { ...parseResult.data };
    if (req.file) {
      data.banner = getRestaurantBannerUrl(req.file.filename);
    }

    try {
      const restaurant = await restaurantService.updateRestaurant(restaurantId, data);
      return res.json(restaurant);
    } catch (err: any) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
  },

  // DELETE /admin/restaurants/:restaurantId
  async delete(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });

    try {
      await restaurantService.deleteRestaurant(restaurantId);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
  },


  // GET /restaurants/:restaurantId/menu
  // Fetch full restaurant info + menu categories + items
  async getFullMenu(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });

    const restaurant = await restaurantService.getRestaurantDetails(restaurantId);

    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    // Send restaurant info + menu categories + items in structured format
    return res.json({
      restaurant: {
        id: restaurant.userId,
        name: restaurant.user.name,
        profilePic: restaurant.user.image,
        banner: restaurant.banner,
        description: restaurant.description,
        location: restaurant.location,
        mainCategory: restaurant.mainCategory,
      },
      menu: restaurant.menuCategories.map(category => ({
        id: category.id,
        name: category.name,
        items: category.items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          preparationTime: item.preparationTime,
          image: item.image,
        })),
      })),
    });
  },
};
