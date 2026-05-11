import { Request, Response } from "express";
import {
  cancelRestaurantSubscription,
  listRestaurantSubscriptions,
} from "./subscription.service";
import { logger } from "../../../libs/logger";
import { getAuthUserId, getAuthRole } from "../../common/utils";

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

// List subscriptions for a restaurant. The caller can only access their own
// unless they're an ADMIN. Restaurants are stored with `userId @id`, so a
// restaurant's auth.user.id equals their restaurantId.
export const getRestaurantSubscriptions = async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  if (!restaurantId) {
    return res.status(400).json({ success: false, error: "Restaurant ID is required" });
  }
  const sessionUserId = getAuthUserId(req);
  if (!sessionUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const role = String(getAuthRole(req) || "").toUpperCase();
  if (role !== "ADMIN" && sessionUserId !== restaurantId) {
    return res.status(403).json({ success: false, error: "Forbidden: you can only view your own subscriptions" });
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

// Convenience endpoint: list the calling restaurant's own subscriptions
// without needing the restaurantId in the URL. Used by the mobile app's
// SubscriptionScreen to detect ACTIVE / PAST_DUE state.
export const getMySubscriptions = async (req: Request, res: Response) => {
  const sessionUserId = getAuthUserId(req);
  if (!sessionUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const subscriptions = await listRestaurantSubscriptions(sessionUserId);
    res.json({
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  } catch (err: any) {
    logger.error("getMySubscriptions error", { error: err.message });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
