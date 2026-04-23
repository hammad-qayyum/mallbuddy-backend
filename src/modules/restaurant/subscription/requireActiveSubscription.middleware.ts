import { Request, Response, NextFunction } from "express";
import { isSubscriptionActive } from "./subscription.service";

// Extend Express Request type for user property if needed
interface AuthRequest extends Request {
  user?: { id?: string };
}

/**
 * Middleware to enforce that a restaurant has an active, paid subscription.
 * Blocks access if the subscription is not active or expired.
 * Assumes req.user.id is the restaurant's userId (adjust as needed for your auth system).
 */
export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // You may need to adjust this depending on your auth implementation
    const restaurantId = req.user?.id || req.body.restaurantId || req.params.restaurantId;
    if (!restaurantId) {
      return res.status(401).json({
        success: false,
        error: "Restaurant ID not found in request."
      });
    }
    const active = await isSubscriptionActive(restaurantId);
    if (!active) {
      return res.status(402).json({
        success: false,
        error: "Subscription inactive or payment required. Please renew your subscription."
      });
    }
    next();
  } catch (err: any) {
    console.error("[Subscription Middleware] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to verify subscription status."
    });
  }
}
