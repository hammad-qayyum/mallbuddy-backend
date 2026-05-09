import { Request, Response } from "express";
import {
  cancelRestaurantSubscription,
  listRestaurantSubscriptions,
} from "./subscription.service";
import { logger } from "../../../libs/logger";

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  const { subscriptionId } = req.body;
  if (!subscriptionId) {
    return res.status(400).json({
      success: false,
      error: "subscriptionId is required",
    });
  }
  try {
    const result = await cancelRestaurantSubscription(subscriptionId);
    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      data: result.dbSub,
    });
  } catch (err: any) {
    logger.error("cancelSubscription error", { error: err.message });
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? "Internal server error" : err.message,
    });
  }
};

// List subscriptions for a restaurant
export const getRestaurantSubscriptions = async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  if (!restaurantId) {
    return res.status(400).json({ success: false, error: "Restaurant ID is required" });
  }
  try {
    const subscriptions = await listRestaurantSubscriptions(restaurantId);
    res.json({
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  } catch (err: any) {
    logger.error("getRestaurantSubscriptions error", { error: err.message });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
