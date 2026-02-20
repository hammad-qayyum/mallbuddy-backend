import { Request, Response } from "express";
import { restaurantService } from "./restaurant.service";
import { createRestaurantService } from "./createRestaurant.service";
import {
  updateRestaurantSchema,
  getRestaurantOrdersSchema,
  getOrderDetailsSchema,
  acceptOrderSchema,
  declineOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  getRestaurantAnalyticsSchema,
  adminCreateRestaurantSchema,
  getAllRestaurantsSystemWideSchema,
} from "./restaurant.schema";
import { getRestaurantBannerUrl } from "../../config/upload";

export const restaurantController = {
  /**
   * Admin creates restaurant account
   * Creates User(role=RESTAURANT) and Restaurant atomically
   */
  async createByAdmin(req: Request, res: Response) {
    const parseResult = adminCreateRestaurantSchema.safeParse(req.body);

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
      const result = await createRestaurantService.createRestaurantByAdmin(data, req);
      return res.status(201).json({
        message: "Restaurant account created successfully",
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
          },
          restaurant: result.restaurant,
        },
      });
    } catch (error: any) {
      // Handle email already exists
      if (error.message?.includes("already exists") || error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "Email already registered" });
      }
      // Handle mall not found
      if (error.message?.includes("does not exist")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ 
        message: error.message || "Failed to create restaurant account" 
      });
    }
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

  // GET /restaurants/all - Public access to all restaurants system-wide
  async getAllSystemWide(req: Request, res: Response) {
    try {
      const page = Number.parseInt((req.query.page ?? "1") as string);
      const limit = Number.parseInt((req.query.limit ?? "10") as string);
      const mallId = req.query.mallId as string | undefined;
      const category = req.query.category as string | undefined;

      const parseResult = getAllRestaurantsSystemWideSchema.safeParse({
        page,
        limit,
        mallId,
        category,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await restaurantService.getAllRestaurantsSystemWidePublic(
        parseResult.data.page || 1,
        parseResult.data.limit || 10,
        parseResult.data.mallId,
        parseResult.data.category
      );

      return res.json({
        message: "Restaurants retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
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

  /**
   * GET /restaurants/:restaurantId/orders - Get all orders for restaurant
   */
  async getRestaurantOrders(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const status = (req.query.status ?? req.body?.status) as string | undefined;
      const limit = Number.parseInt((req.query.limit ?? "10") as string);
      const offset = Number.parseInt((req.query.offset ?? "0") as string);

      const parseResult = getRestaurantOrdersSchema.safeParse({
        restaurantId,
        status,
        limit,
        offset,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const orders = await restaurantService.getRestaurantOrders(parseResult.data);

      return res.json({
        message: "Restaurant orders retrieved successfully",
        data: orders,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /restaurants/:restaurantId/orders/:orderId - Get order details
   */
  async getRestaurantOrderDetails(req: Request, res: Response) {
    try {
      const { restaurantId, orderId } = req.params;

      const parseResult = getOrderDetailsSchema.safeParse({
        orderId,
        restaurantId,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const order = await restaurantService.getRestaurantOrderDetails(parseResult.data);

      return res.json({
        message: "Order details retrieved successfully",
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * POST /restaurants/:restaurantId/orders/:orderId/accept - Accept order
   */
  async acceptOrder(req: Request, res: Response) {
    try {
      const { restaurantId, orderId } = req.params;

      const parseResult = acceptOrderSchema.safeParse({
        orderId,
        restaurantId,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await restaurantService.acceptOrder(parseResult.data);

      return res.json({
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized") || error.message.includes("cannot be accepted")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * POST /restaurants/:restaurantId/orders/:orderId/decline - Decline order
   */
  async declineOrder(req: Request, res: Response) {
    try {
      const { restaurantId, orderId } = req.params;
      const { reason } = req.body;

      const parseResult = declineOrderSchema.safeParse({
        orderId,
        restaurantId,
        reason,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.issues,
        });
      }

      const result = await restaurantService.declineOrder(parseResult.data);

      return res.json({
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized") || error.message.includes("cannot be declined")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * PATCH /restaurants/:restaurantId/orders/:orderId/status - Update order status
   */
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { restaurantId, orderId } = req.params;
      const { status } = req.body;

      const parseResult = updateOrderStatusSchema.safeParse({
        orderId,
        restaurantId,
        status,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.issues,
        });
      }

      const result = await restaurantService.updateOrderStatus(parseResult.data);

      return res.json({
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized") || error.message.includes("Invalid status transition")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * PATCH /restaurants/:restaurantId/orders/:orderId/payment-status - Update payment status for COD orders
   */
  async updatePaymentStatus(req: Request, res: Response) {
    try {
      const { restaurantId, orderId } = req.params;
      const { paymentStatus, reason } = req.body;

      const parseResult = updatePaymentStatusSchema.safeParse({
        orderId,
        restaurantId,
        paymentStatus,
        reason,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.issues,
        });
      }

      const result = await restaurantService.updatePaymentStatus(parseResult.data);

      return res.json({
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized") || error.message.includes("Invalid") || error.message.includes("only allowed")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /restaurants/:restaurantId/analytics/orders-revenue - Get restaurant analytics
   */
  async getRestaurantAnalytics(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const page = Number.parseInt((req.query.page ?? "1") as string);
      const limit = Number.parseInt((req.query.limit ?? "10") as string);

      const parseResult = getRestaurantAnalyticsSchema.safeParse({
        restaurantId,
        page,
        limit,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await restaurantService.getRestaurantOrdersAndRevenue(
        parseResult.data.restaurantId,
        parseResult.data.page || 1,
        parseResult.data.limit || 10
      );

      return res.json({
        message: "Restaurant analytics retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

};
