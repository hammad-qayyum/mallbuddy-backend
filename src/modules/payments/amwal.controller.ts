import { Request, Response } from "express";
import { AmwalPayService } from "../../libs/amwalpay";
import prisma from "../../config/prisma";

function toNumberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toNumber" in value) {
    const maybeDecimal = value as { toNumber: () => number };
    return maybeDecimal.toNumber();
  }
  return Number(value);
}

// Build a signed SmartBox checkout config for a restaurant subscription.
// The frontend feeds the returned `smartbox` object directly to
// `SmartBox.Checkout.configure({...})`.
export const initiateAmwalSubscriptionPayment = async (req: Request, res: Response) => {
  try {
    const { restaurantId, planId } = req.body;
    if (!restaurantId || !planId) {
      return res.status(400).json({ success: false, error: "restaurantId and planId are required" });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
    });
    if (!restaurant) return res.status(404).json({ success: false, error: "Restaurant not found" });
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });

    const amount = toNumberValue(plan.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid subscription plan amount" });
    }

    const dbSub = await prisma.restaurantSubscription.create({
      data: {
        restaurantId,
        planId,
        status: "INCOMPLETE",
        startDate: new Date(),
      },
    });

    const amwal = new AmwalPayService();
    const smartbox = amwal.buildSmartBoxConfig({
      amount,
      currency: "OMR",
      merchantReference: dbSub.id,
    });

    return res.json({
      success: true,
      subscriptionId: dbSub.id,
      scriptUrl: AmwalPayService.scriptUrl,
      smartbox,
    });
  } catch (err: any) {
    console.error("[Amwal] Payment initiation error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
