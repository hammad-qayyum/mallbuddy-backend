import { Request, Response, NextFunction } from "express";
import { isSubscriptionActive } from "./subscription.service";
import { getAuthUserId, getAuthRole } from "../../common/utils";

/**
 * Enforce that the requesting restaurant has an active, paid subscription.
 *
 * Reads `restaurantId` from the authenticated session (which is the User.id —
 * for users with role RESTAURANT, that's also their restaurant id). ADMINs
 * bypass the gate so they can fix or operate on inactive restaurants.
 *
 * Returns 402 (Payment Required) when the subscription is missing or expired.
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const role = getAuthRole(req);

    // Admins are unaffected — they need to be able to fix things.
    if (role === "ADMIN") return next();

    const restaurantId = getAuthUserId(req);
    if (!restaurantId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const active = await isSubscriptionActive(restaurantId);
    if (!active) {
      return res.status(402).json({
        success: false,
        error: "Subscription inactive or payment required. Please renew your subscription.",
      });
    }
    next();
  } catch (err: any) {
    console.error("[Subscription Middleware] Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to verify subscription status.",
    });
  }
}
