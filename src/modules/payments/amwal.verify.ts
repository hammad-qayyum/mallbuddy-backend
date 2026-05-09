import { Request, Response } from "express";
import prisma from "../../config/prisma";

// Poll subscription status from the frontend after SmartBox returns a result —
// gives the UI a chance to confirm the webhook has flipped the row to ACTIVE.
// Restricted to the owning restaurant or ADMIN.
export const verifyAmwalPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ status: "INVALID_REQUEST", error: "Missing orderId" });
    }

    const authUser = (req as any).auth?.user;
    if (!authUser?.id) {
      return res.status(401).json({ status: "UNAUTHORIZED" });
    }

    const sub = await prisma.restaurantSubscription.findUnique({ where: { id: orderId } });
    if (!sub) return res.status(404).json({ status: "NOT_FOUND" });

    const role = String(authUser.role || "").toUpperCase();
    if (role !== "ADMIN" && sub.restaurantId !== authUser.id) {
      // Don't disclose existence of someone else's subscription.
      return res.status(404).json({ status: "NOT_FOUND" });
    }

    return res.json({
      status: sub.status,
      planId: sub.planId,
      restaurantId: sub.restaurantId,
      expiresAt: sub.endDate,
    });
  } catch (err: any) {
    console.error("[Amwal] Verify payment error", err);
    return res.status(500).json({ status: "ERROR", error: err.message });
  }
};
