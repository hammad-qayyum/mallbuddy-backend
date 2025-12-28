import { Request, Response } from "express";
import { analyticsService } from "./analytics.service";
import {
  getMallAnalyticsSchema,
  getRestaurantSalesSummarySchema,
  getPromoCodeDetailsSchema,
  getPromoCodeUsageOverTimeSchema,
  getPromoCodeOrdersSchema,
  getAllRestaurantsSystemWideSchema,
} from "./analytics.schema";

export const analyticsController = {
  /**
   * GET /analytics/overall - Get overall statistics
   */
  async getOverallStatistics(req: Request, res: Response) {
    try {
      const statistics = await analyticsService.getOverallStatistics();

      return res.json({
        message: "Overall statistics retrieved successfully",
        data: statistics,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /analytics/mall/:mallId - Get mall analytics with time period and trends
   */
  async getMallAnalytics(req: Request, res: Response) {
    try {
      const { mallId } = req.params;
      const period = (req.query.period ?? "all") as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const parseResult = getMallAnalyticsSchema.safeParse({
        mallId,
        period,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await analyticsService.getMallAnalytics(parseResult.data);

      return res.json({
        message: "Mall analytics retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /analytics/restaurant/:restaurantId/sales-summary - Get restaurant sales summary
   */
  async getRestaurantSalesSummary(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const period = (req.query.period ?? "all") as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const parseResult = getRestaurantSalesSummarySchema.safeParse({
        restaurantId,
        period,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await analyticsService.getRestaurantSalesSummary(parseResult.data);

      return res.json({
        message: "Restaurant sales summary retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /analytics/promo-code/:promoCodeId/details - Get promoCode details
   */
  async getPromoCodeDetails(req: Request, res: Response) {
    try {
      const { promoCodeId } = req.params;

      const parseResult = getPromoCodeDetailsSchema.safeParse({
        promoCodeId,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await analyticsService.getPromoCodeDetails(parseResult.data);

      return res.json({
        message: "PromoCode details retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /analytics/promo-code/:promoCodeId/usage-over-time - Get promoCode usage over time
   */
  async getPromoCodeUsageOverTime(req: Request, res: Response) {
    try {
      const { promoCodeId } = req.params;
      const period = (req.query.period ?? "month") as string;

      const parseResult = getPromoCodeUsageOverTimeSchema.safeParse({
        promoCodeId,
        period,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await analyticsService.getPromoCodeUsageOverTime(parseResult.data);

      return res.json({
        message: "PromoCode usage over time retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /analytics/promo-code/:promoCodeId/discount-impact - Get discount impact by order value
   */
  async getPromoCodeDiscountImpact(req: Request, res: Response) {
    try {
      const { promoCodeId } = req.params;

      if (!promoCodeId) {
        return res.status(400).json({ message: "PromoCode ID is required" });
      }

      const result = await analyticsService.getPromoCodeDiscountImpact(promoCodeId);

      return res.json({
        message: "PromoCode discount impact retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /analytics/promo-code/:promoCodeId/orders - Get orders using promoCode with pagination
   */
  async getPromoCodeOrders(req: Request, res: Response) {
    try {
      const { promoCodeId } = req.params;
      const page = Number.parseInt((req.query.page ?? "1") as string);
      const limit = Number.parseInt((req.query.limit ?? "10") as string);

      const parseResult = getPromoCodeOrdersSchema.safeParse({
        promoCodeId,
        page,
        limit,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const result = await analyticsService.getPromoCodeOrders(parseResult.data);

      return res.json({
        message: "PromoCode orders retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  
  /**
   * GET /restaurants/all - Get all restaurants system-wide with pagination
   */
  async getAllRestaurantsSystemWide(req: Request, res: Response) {
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

      const result = await analyticsService.getAllRestaurantsSystemWide(
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
};

