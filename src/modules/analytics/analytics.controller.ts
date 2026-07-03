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
import { getMallScope } from "../../middlewares/role.middleware";
import { getAuthRole, getAuthUserId } from "../common/utils";

export const analyticsController = {
  /**
   * GET /analytics/overall - Get overall statistics.
   * For MALL_ADMIN the figures are confined to their mall (GAP-018); the
   * response shape is identical to the super-admin (platform-wide) call.
   */
  async getOverallStatistics(req: Request, res: Response) {
    try {
      const statistics = await analyticsService.getOverallStatistics(getMallScope(req));

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

      // GAP-018: a mall admin may only read their own mall's analytics.
      const scope = getMallScope(req);
      if (scope && mallId !== scope) {
        return res.status(403).json({ message: "Forbidden: not your mall" });
      }

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

      // GAP-018: MALL_ADMIN is confined to restaurants of their mall.
      // A RESTAURANT caller may only read their own summary (the restaurant
      // id doubles as the owner's user id).
      const role = getAuthRole(req);
      if (role === "RESTAURANT" && getAuthUserId(req) !== parseResult.data.restaurantId) {
        return res.status(403).json({ message: "Forbidden: not your restaurant" });
      }
      const scope = role === "MALL_ADMIN" ? getMallScope(req) : null;

      const result = await analyticsService.getRestaurantSalesSummary(parseResult.data, scope);

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

      const result = await analyticsService.getPromoCodeDetails(parseResult.data, getMallScope(req));

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

      const result = await analyticsService.getPromoCodeUsageOverTime(parseResult.data, getMallScope(req));

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

      const result = await analyticsService.getPromoCodeDiscountImpact(promoCodeId, getMallScope(req));

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

      const result = await analyticsService.getPromoCodeOrders(parseResult.data, getMallScope(req));

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

      // GAP-018: MALL_ADMIN listings are pinned to their mall regardless of
      // the mallId query param.
      const scope = getMallScope(req);

      const result = await analyticsService.getAllRestaurantsSystemWide(
        parseResult.data.page || 1,
        parseResult.data.limit || 10,
        scope ?? parseResult.data.mallId,
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

