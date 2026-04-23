import { Request, Response } from "express";
import prisma from "../../config/prisma";

// Verify payment status for redirect-based fallback
export const verifyAmwalPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ status: "INVALID_REQUEST", error: "Missing orderId" });
    }

    const sub = await prisma.restaurantSubscription.findUnique({ where: { id: orderId } });
    if (!sub) return res.status(404).json({ status: "NOT_FOUND" });
    const amwalSubscriptionId =
      (sub as any).amwalSubscriptionId ?? (sub as any).amualSubscriptionId ?? null;
    return res.json({
      status: sub.status,
      amwalSubscriptionId,
      planId: sub.planId,
      restaurantId: sub.restaurantId,
      expiresAt: sub.endDate,
    });
  } catch (err: any) {
    console.error("[Amwal] Verify payment error", err);
    return res.status(500).json({ status: "ERROR", error: err.message });
  }
};

// Return/callback endpoint for hosted checkout when testing backend only.
// Amwal redirects the browser to this URL after payment.
export const amwalReturnCallback = async (req: Request, res: Response) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const orderId =
      query.order_id ||
      query.orderId ||
      query.OrderId ||
      query.merchant_reference ||
      query.reference;

    if (!orderId) {
      return res.status(400).json({
        status: "INVALID_REQUEST",
        message: "Missing order id in callback query params",
        query,
      });
    }

    const sub = await prisma.restaurantSubscription.findUnique({ where: { id: orderId } });
    if (!sub) {
      return res.status(404).json({
        status: "NOT_FOUND",
        message: "Subscription not found for callback order id",
        orderId,
        query,
      });
    }

    const amwalSubscriptionId =
      (sub as any).amwalSubscriptionId ?? (sub as any).amualSubscriptionId ?? null;
    return res.json({
      status: "RETURN_RECEIVED",
      orderId,
      subscriptionStatus: sub.status,
      amwalSubscriptionId,
      planId: sub.planId,
      restaurantId: sub.restaurantId,
      message:
        "Browser return received. Final status may still update via webhook; call /api/payments/amwal/verify/:orderId to confirm.",
      query,
    });
  } catch (err: any) {
    console.error("[Amwal] Return callback error", err);
    return res.status(500).json({ status: "ERROR", error: err.message });
  }
};
